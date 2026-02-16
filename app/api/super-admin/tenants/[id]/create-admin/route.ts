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

    if (!email || !password || !full_name) {
      return NextResponse.json(
        { error: "Email, contraseña y nombre completo son requeridos" },
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

    // Create user with admin role
    const { data: userData, error: createError } =
      await supabase.auth.admin.createUser({
        email,
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
