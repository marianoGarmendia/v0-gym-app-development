import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

// Admin API route to create users without email confirmation
// Uses SUPABASE_SERVICE_ROLE_KEY for admin privileges
// Reads tenant_id from the admin's profile (no more adminSecret for tenant)
// Handles existing emails: creates membership instead of failing

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, full_name, role, adminSecret } = body;

    const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY;

    // Auth: adminSecret OR session with profile.role === 'admin'
    const hasValidSecret = adminSecret === ADMIN_SECRET_KEY;
    let isAdminSession = false;
    let adminTenantId: string | null = null;

    if (!hasValidSecret) {
      const supabase = await createServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, tenant_id")
          .eq("id", user.id)
          .single();
        isAdminSession = profile?.role === "admin";
        adminTenantId = profile?.tenant_id || null;
      }
    }

    if (!hasValidSecret && !isAdminSession) {
      return NextResponse.json(
        {
          error:
            "No autorizado. Usa la clave de administrador o inicia sesion como admin.",
        },
        { status: 401 },
      );
    }

    // Validate required fields
    if (!email || !password || !full_name || !role) {
      return NextResponse.json(
        { error: "Faltan campos requeridos" },
        { status: 400 },
      );
    }

    // Validate role
    if (!["admin", "trainer", "student"].includes(role)) {
      return NextResponse.json({ error: "Rol invalido" }, { status: 400 });
    }

    // Determine tenant_id: from admin session or from request body (for adminSecret)
    const tenantId = adminTenantId || body.tenant_id;
    if (!tenantId) {
      return NextResponse.json(
        { error: "No se pudo determinar el tenant_id" },
        { status: 400 },
      );
    }

    // Create Supabase admin client with service role key
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // Try to create user with admin API (no email confirmation needed)
    const { data: userData, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name,
          role,
          tenant_id: tenantId,
        },
        app_metadata: {
          active_tenant_id: tenantId,
        },
      });

    if (createError) {
      // Handle existing email: create membership instead
      if (
        createError.message.includes("already been registered") ||
        createError.message.includes("already registered") ||
        createError.message.includes("User already registered")
      ) {
        return await handleExistingUser(
          supabaseAdmin,
          email.trim().toLowerCase(),
          tenantId,
          role,
          full_name
        );
      }

      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userData.user.id,
        email: userData.user.email,
        full_name,
        role,
      },
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleExistingUser(
  supabaseAdmin: any,
  email: string,
  tenantId: string,
  role: string,
  fullName: string
) {
  // Find user by email
  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
  const authUser = usersData?.users?.find((u) => u.email === email);

  if (!authUser) {
    return NextResponse.json(
      { error: "Error al buscar el usuario existente" },
      { status: 500 },
    );
  }

  // Check if already has membership in this tenant
  const { data: existingMembership } = await supabaseAdmin
    .from("tenant_memberships")
    .select("id")
    .eq("user_id", authUser.id)
    .eq("tenant_id", tenantId)
    .single();

  if (existingMembership) {
    return NextResponse.json(
      { error: "Este usuario ya esta registrado en este gimnasio" },
      { status: 400 },
    );
  }

  // Create membership
  const { error: membershipError } = await supabaseAdmin
    .from("tenant_memberships")
    .insert({
      user_id: authUser.id,
      tenant_id: tenantId,
      role,
    });

  if (membershipError) {
    console.error("Error creating membership:", membershipError);
    return NextResponse.json(
      { error: "Error al crear la membresia" },
      { status: 500 },
    );
  }

  // Set active_tenant_id
  await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
    app_metadata: { active_tenant_id: tenantId },
  });

  return NextResponse.json({
    success: true,
    user: {
      id: authUser.id,
      email,
      full_name: fullName,
      role,
    },
    message: "Usuario existente agregado a este gimnasio",
  });
}
