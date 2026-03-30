import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(request: Request) {
  try {
    const { userId, newRole } = await request.json();

    if (!userId || !newRole) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    if (!["admin", "trainer", "student"].includes(newRole)) {
      return NextResponse.json({ error: "Rol invalido" }, { status: 400 });
    }

    // Verify caller is an admin
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("role, tenant_id")
      .eq("id", user.id)
      .single();

    if (!adminProfile || adminProfile.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const tenantId = adminProfile.tenant_id;
    const supabaseAdmin = createAdminClient();

    // Update profiles.role
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .eq("tenant_id", tenantId);

    if (profileError) {
      console.error("Error updating profile role:", profileError);
      return NextResponse.json({ error: "Error al actualizar perfil" }, { status: 500 });
    }

    // Update tenant_memberships.role
    const { error: membershipError } = await supabaseAdmin
      .from("tenant_memberships")
      .update({ role: newRole })
      .eq("user_id", userId)
      .eq("tenant_id", tenantId);

    if (membershipError) {
      console.error("Error updating membership role:", membershipError);
      return NextResponse.json({ error: "Error al actualizar membresia" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in update-user-role:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
