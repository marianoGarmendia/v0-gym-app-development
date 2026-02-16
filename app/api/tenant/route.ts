import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET: Fetch current tenant data (for admin settings)
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, tenant_id")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // Use admin client to read tenant (bypasses RLS)
    const supabaseAdmin = createAdminClient();
    const { data: tenant, error } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .eq("id", profile.tenant_id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tenant });
  } catch (error) {
    console.error("Error fetching tenant:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// PATCH: Update tenant branding/info (admin only)
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, tenant_id")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();

    // Only allow these fields to be updated by gym admin
    const allowedFields: Record<string, unknown> = {};
    const allowed = ["name", "description", "email", "phone", "logo_url", "theme"];
    for (const key of allowed) {
      if (key in body) {
        allowedFields[key] = body[key];
      }
    }

    const supabaseAdmin = createAdminClient();
    const { data: tenant, error } = await supabaseAdmin
      .from("tenants")
      .update(allowedFields)
      .eq("id", profile.tenant_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tenant });
  } catch (error) {
    console.error("Error updating tenant:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
