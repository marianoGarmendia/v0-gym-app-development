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

    const host = request.headers.get("host");
    const tenantSlug = extractTenantSlug(host);

    // Root domain → only superadmins allowed
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
        role: "superadmin",
      });
    }

    // Tenant domain → resolve gym
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

    // Update app_metadata so the JWT includes active_tenant_id (used by RLS via auth.jwt())
    await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
      app_metadata: { active_tenant_id: tenant.id },
    });

    // Update only the role in profile — do NOT update tenant_id because that
    // field is global (one row per user) and updating it breaks concurrent
    // sessions the user has in other gyms
    await supabaseAdmin
      .from("profiles")
      .update({ role: membership.role })
      .eq("id", authUser.id);

    // Sign in to generate a fresh JWT that includes the updated app_metadata
    const { data: signInData, error: signInError } =
      await supabaseAdmin.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

    if (signInError || !signInData.session) {
      return NextResponse.json(
        { error: "Email o contrasena incorrectos" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      session: signInData.session,
      user: signInData.user,
      role: membership.role,
    });
  } catch (error) {
    console.error("Error in login:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
