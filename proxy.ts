import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { extractTenantSlug } from "@/lib/tenant";

const publicRoutes = [
  "/",
  "/auth/login",
  "/auth/sign-up",
  "/auth/error",
  "/auth/sign-up-success",
  "/auth/admin",
  "/auth/callback",
  "/auth/reset-password",
  "/api/admin/create-user",
  "/api/auth/sign-up",
  "/api/auth/login",
  "/api/manifest",
  "/tenant-not-found",
];

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // --- Supabase session refresh (existing logic from proxy.ts) ---
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // --- Super-admin routes: no tenant required ---
  const pathname = request.nextUrl.pathname;
  const isSuperAdminRoute = pathname.startsWith("/super-admin") || pathname.startsWith("/api/super-admin");

  if (isSuperAdminRoute) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      return NextResponse.redirect(url);
    }

    // Verify superadmin role
    const { data: saProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!saProfile || saProfile.role !== "superadmin") {
      return new NextResponse("No autorizado. Se requiere rol superadmin.", {
        status: 403,
      });
    }

    return supabaseResponse;
  }

  // --- Tenant resolution ---
  const host = request.headers.get("host");
  const tenantSlug = extractTenantSlug(host);

  if (tenantSlug) {
    // Subdomain detected → resolve tenant from DB
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, slug, name, is_active, theme")
      .eq("slug", tenantSlug)
      .eq("is_active", true)
      .single();

    if (!tenant) {
      // Tenant not found or inactive → rewrite to error page
      const url = request.nextUrl.clone();
      url.pathname = "/tenant-not-found";
      return NextResponse.rewrite(url);
    }

    // If user is authenticated, validate they have a membership in this tenant
    // Superadmins can access any tenant
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "superadmin") {
        // Use tenant_memberships as source of truth (not app_metadata, which is
        // user-global and breaks simultaneous sessions across multiple gyms)
        const { data: membership } = await supabase
          .from("tenant_memberships")
          .select("id")
          .eq("user_id", user.id)
          .eq("tenant_id", tenant.id)
          .single();

        if (!membership) {
          return new NextResponse("No tienes acceso a este gimnasio.", {
            status: 403,
          });
        }
      }
    }

    // Set tenant headers on response
    supabaseResponse.headers.set("x-tenant-id", tenant.id);
    supabaseResponse.headers.set("x-tenant-slug", tenant.slug);
    supabaseResponse.headers.set("x-tenant-name", tenant.name);
    supabaseResponse.headers.set("x-tenant-theme", JSON.stringify(tenant.theme));
  }

  /*
  tenant schema:

  */

  // --- Auth protection (existing logic) ---
  const isPublicRoute = publicRoutes.some(
    (route) => request.nextUrl.pathname === route
  );

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
