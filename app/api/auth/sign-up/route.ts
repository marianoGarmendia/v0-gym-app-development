import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { extractTenantSlug } from "@/lib/tenant";

// Public sign-up endpoint - only creates students
// Uses service role to skip email confirmation
// Resolves tenant from Host header subdomain

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

    const { data: userData, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name,
          role: "student", // Always student - cannot be overridden
          tenant_id: tenant.id,
        },
      });

    if (createError) {
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
