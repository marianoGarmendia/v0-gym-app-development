import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tenantId } = await params;
    const supabase = createAdminClient();

    const { data: users, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ users: users || [] });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
