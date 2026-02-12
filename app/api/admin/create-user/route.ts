import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

// Admin API route to create users without email confirmation
// Uses SUPABASE_SERVICE_ROLE_KEY for admin privileges
// Auth: either adminSecret (scripts/external) or logged-in admin session (dashboard)

const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY;
console.log(ADMIN_SECRET_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, full_name, role, adminSecret } = body;

    // Auth: adminSecret OR session with profile.role === 'admin'
    const hasValidSecret = adminSecret === ADMIN_SECRET_KEY;
    let isAdminSession = false;
    if (!hasValidSecret) {
      const supabase = await createServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        isAdminSession = profile?.role === "admin";
      }
    }

    if (!hasValidSecret && !isAdminSession) {
      return NextResponse.json(
        {
          error:
            "No autorizado. Usa la clave de administrador o inicia sesión como admin.",
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

    // Create user with admin API (no email confirmation needed)
    const { data: userData, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Skip email verification
        user_metadata: {
          full_name,
          role,
        },
      });

    if (createError) {
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
