import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = createAdminClient();

    // Get all tenants except platform
    const { data: tenants, error } = await supabase
      .from("tenants")
      .select("*")
      .neq("slug", "platform")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get user counts per tenant
    const { data: userCounts, error: countError } = await supabase
      .from("profiles")
      .select("tenant_id")
      .neq("role", "superadmin");

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    // Count users per tenant
    const countsMap: Record<string, number> = {};
    userCounts?.forEach((p) => {
      countsMap[p.tenant_id] = (countsMap[p.tenant_id] || 0) + 1;
    });

    const tenantsWithCounts = tenants?.map((t) => ({
      ...t,
      user_count: countsMap[t.id] || 0,
    }));

    return NextResponse.json({ tenants: tenantsWithCounts });
  } catch (error) {
    console.error("Error fetching tenants:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, slug, description, email, phone, logo_url, theme, plan } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: "Nombre y slug son requeridos" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Check if slug already exists
    const { data: existing } = await supabase
      .from("tenants")
      .select("id")
      .eq("slug", slug)
      .single();

    if (existing) {
      return NextResponse.json({ error: "El slug ya está en uso" }, { status: 409 });
    }

    const { data: tenant, error } = await supabase
      .from("tenants")
      .insert({
        name,
        slug,
        description: description || null,
        email: email || null,
        phone: phone || null,
        logo_url: logo_url || null,
        theme: theme || null,
        plan: plan || "free",
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tenant }, { status: 201 });
  } catch (error) {
    console.error("Error creating tenant:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
