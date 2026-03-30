import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tenantId } = await params;
    const body = await request.json();
    const { email, password, full_name } = body;

    if (!email || !full_name) {
      return NextResponse.json(
        { error: "Email y nombre completo son requeridos" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify tenant exists
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("id, name")
      .eq("id", tenantId)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });
    }

    // Check if a user with this email already exists in auth
    const { data: usersData } = await supabase.auth.admin.listUsers();
    const existingUser = usersData?.users?.find(
      (u) => u.email === email.trim().toLowerCase()
    );

    if (existingUser) {
      // User exists — check if they already have a membership in this tenant
      const { data: existingMembership } = await supabase
        .from("tenant_memberships")
        .select("id, role")
        .eq("user_id", existingUser.id)
        .eq("tenant_id", tenantId)
        .single();

      if (existingMembership) {
        return NextResponse.json(
          { error: `Este usuario ya pertenece a este gimnasio con el rol "${existingMembership.role}"` },
          { status: 409 }
        );
      }

      // Add membership with admin role for this tenant
      const { error: membershipError } = await supabase
        .from("tenant_memberships")
        .insert({ user_id: existingUser.id, tenant_id: tenantId, role: "admin" });

      if (membershipError) {
        return NextResponse.json({ error: membershipError.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        user: {
          id: existingUser.id,
          email: existingUser.email,
          full_name,
          role: "admin",
        },
        note: "Usuario existente agregado al gimnasio como admin",
      }, { status: 200 });
    }

    // User does not exist — password is required to create one
    if (!password) {
      return NextResponse.json(
        { error: "La contraseña es requerida para crear un nuevo usuario" },
        { status: 400 }
      );
    }

    // Create new auth user — handle_new_user trigger will create profile + membership
    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role: "admin",
        tenant_id: tenantId,
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
        role: "admin",
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating admin:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
