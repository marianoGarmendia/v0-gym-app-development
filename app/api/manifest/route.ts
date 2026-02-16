import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { extractTenantSlug } from "@/lib/tenant";

export async function GET(request: Request) {
  const host = request.headers.get("host");
  const tenantSlug = extractTenantSlug(host);

  let name = "G10 Flow";
  let shortName = "G10 Flow";
  let themeColor = "#1c1c1c";
  let backgroundColor = "#1c1c1c";

  if (tenantSlug) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: tenant } = await supabase
      .from("tenants")
      .select("name, theme")
      .eq("slug", tenantSlug)
      .eq("is_active", true)
      .single();

    if (tenant) {
      name = tenant.name;
      shortName = tenant.name;
      if (tenant.theme?.theme_color) themeColor = tenant.theme.theme_color;
      if (tenant.theme?.background_color) backgroundColor = tenant.theme.background_color;
    }
  }

  const manifest = {
    name,
    short_name: shortName,
    start_url: "/dashboard",
    display: "standalone",
    theme_color: themeColor,
    background_color: backgroundColor,
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
    },
  });
}
