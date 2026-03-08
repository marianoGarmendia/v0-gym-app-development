import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { extractTenantSlug } from "@/lib/tenant";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contrasena son requeridos" },
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

    // If no tenant slug (root domain), handle superadmin login directly
    if (!tenantSlug) {
      const { data: signInData, error: signInError } =
        await supabaseAdmin.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

      if (signInError) {
        return NextResponse.json(
          { error: "Email o contrasena incorrectos" },
          { status: 401 }
        );
      }

      // Check if superadmin
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", signInData.user.id)
        .single();

      if (profile?.role !== "superadmin") {
        return NextResponse.json(
          { error: "Accede desde el subdominio de tu gimnasio" },
          { status: 403 }
        );
      }

      return NextResponse.json({
        session: signInData.session,
        user: signInData.user,
      });
    }

    // Resolve tenant
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("id, name, is_active")
      .eq("slug", tenantSlug)
      .single();

    if (!tenant || !tenant.is_active) {
      return NextResponse.json(
        { error: "Gimnasio no encontrado o inactivo" },
        { status: 404 }
      );
    }

    // Find user by email
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
    const authUser = usersData?.users?.find(
      (u) => u.email === email.trim().toLowerCase()
    );

    if (!authUser) {
      return NextResponse.json(
        { error: "Email o contrasena incorrectos" },
        { status: 401 }
      );
    }

    // Check membership for this tenant
    const { data: membership } = await supabaseAdmin
      .from("tenant_memberships")
      .select("id, role")
      .eq("user_id", authUser.id)
      .eq("tenant_id", tenant.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "No estas registrado en este gimnasio" },
        { status: 403 }
      );
    }

    // Set active_tenant_id in app_metadata BEFORE signing in
    await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
      app_metadata: { active_tenant_id: tenant.id },
    });

    // Now sign in to validate password and generate session with updated JWT
    const { data: signInData, error: signInError } =
      await supabaseAdmin.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

    if (signInError) {
      return NextResponse.json(
        { error: "Email o contrasena incorrectos" },
        { status: 401 }
      );
    }

    // Update profile tenant_id to the active tenant for backward compat
    await supabaseAdmin
      .from("profiles")
      .update({ tenant_id: tenant.id, role: membership.role })
      .eq("id", authUser.id);

    return NextResponse.json({
      session: signInData.session,
      user: signInData.user,
    });
  } catch (error) {
    console.error("Error in login:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
