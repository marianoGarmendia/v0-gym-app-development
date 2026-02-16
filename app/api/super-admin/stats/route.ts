import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = createAdminClient();

    // Total tenants (excluding platform)
    const { count: totalTenants } = await supabase
      .from("tenants")
      .select("*", { count: "exact", head: true })
      .neq("slug", "platform");

    // Active tenants
    const { count: activeTenants } = await supabase
      .from("tenants")
      .select("*", { count: "exact", head: true })
      .neq("slug", "platform")
      .eq("is_active", true);

    // Total users (excluding superadmins)
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .neq("role", "superadmin");

    // Users created this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: usersThisMonth } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .neq("role", "superadmin")
      .gte("created_at", startOfMonth.toISOString());

    return NextResponse.json({
      totalTenants: totalTenants || 0,
      activeTenants: activeTenants || 0,
      totalUsers: totalUsers || 0,
      usersThisMonth: usersThisMonth || 0,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
