import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { extractTenantSlug } from "@/lib/tenant";

// Public sign-up endpoint - only creates students
// Uses service role to skip email confirmation
// Resolves tenant from Host header subdomain
// Handles existing emails: verifies password, creates new membership

export async function POST(request: Request) {
  try {
    const { email, password, full_name } = await request.json();

    if (!email || !password || !full_name) {
      return NextResponse.json(
        { error: "Faltan campos requeridos" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contrasena debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Resolve tenant from Host header
    const host = request.headers.get("host");
    const tenantSlug = extractTenantSlug(host);

    if (!tenantSlug) {
      return NextResponse.json(
        { error: "No se pudo determinar el gimnasio. Accede desde el subdominio correcto." },
        { status: 400 }
      );
    }

    // Validate tenant exists and is active
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .select("id, name, is_active")
      .eq("slug", tenantSlug)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json(
        { error: "Gimnasio no encontrado" },
        { status: 404 }
      );
    }

    if (!tenant.is_active) {
      return NextResponse.json(
        { error: "Este gimnasio esta inactivo" },
        { status: 403 }
      );
    }

    // Try to create new user
    const { data: userData, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name,
          role: "student",
          tenant_id: tenant.id,
        },
        app_metadata: {
          active_tenant_id: tenant.id,
        },
      });

    if (createError) {
      // Check if user already exists
      if (
        createError.message.includes("already been registered") ||
        createError.message.includes("already registered") ||
        createError.message.includes("User already registered")
      ) {
        return await handleExistingUser(
          supabaseAdmin,
          email.trim().toLowerCase(),
          password,
          tenant.id
        );
      }

      return NextResponse.json(
        { error: createError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userData.user.id,
        email: userData.user.email,
        full_name,
      },
    });
  } catch (error) {
    console.error("Error in public sign-up:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleExistingUser(
  supabaseAdmin: any,
  email: string,
  password: string,
  tenantId: string
) {
  // Verify password with a separate anon client to avoid polluting the admin client's auth state
  const { createClient: createAnonClient } = await import("@supabase/supabase-js");
  const anonClient = createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: signInData, error: signInError } =
    await anonClient.auth.signInWithPassword({
      email,
      password,
    });

  if (signInError) {
    return NextResponse.json(
      {
        error:
          "Este email ya esta registrado. Si ya tenes cuenta, verifica tu contrasena.",
      },
      { status: 400 }
    );
  }

  const userId = signInData.user.id;

  // Check if already has membership in this tenant
  const { data: existingMembership } = await supabaseAdmin
    .from("tenant_memberships")
    .select("id")
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .single();

  if (existingMembership) {
    return NextResponse.json(
      { error: "Ya estas registrado en este gimnasio" },
      { status: 400 }
    );
  }

  // Create new membership
  const { error: membershipError } = await supabaseAdmin
    .from("tenant_memberships")
    .insert({
      user_id: userId,
      tenant_id: tenantId,
      role: "student",
    });

  if (membershipError) {
    console.error("Error creating membership:", membershipError);
    return NextResponse.json(
      { error: "Error al registrarte en este gimnasio" },
      { status: 500 }
    );
  }

  // Set active_tenant_id for this new tenant
  await supabaseAdmin.auth.admin.updateUserById(userId, {
    app_metadata: { active_tenant_id: tenantId },
  });

  return NextResponse.json({
    success: true,
    user: {
      id: userId,
      email,
    },
    message: "Te registraste exitosamente en este gimnasio",
  });
}
