import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = createAdminClient();

    const { data: tenant, error } = await supabase
      .from("tenants")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tenant });
  } catch (error) {
    console.error("Error updating tenant:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    // Soft delete: set is_active = false
    const { data: tenant, error } = await supabase
      .from("tenants")
      .update({ is_active: false })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tenant });
  } catch (error) {
    console.error("Error deactivating tenant:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
