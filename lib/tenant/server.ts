import { headers } from "next/headers";
import type { Tenant } from "./index";

/**
 * Get tenant context from headers set by middleware.
 * Use this in Server Components and API routes.
 */
export async function getTenantContext(): Promise<{
  tenantId: string | null;
  tenantSlug: string | null;
  tenantName: string | null;
  tenantTheme: string | null;
}> {
  const headersList = await headers();

  return {
    tenantId: headersList.get("x-tenant-id"),
    tenantSlug: headersList.get("x-tenant-slug"),
    tenantName: headersList.get("x-tenant-name"),
    tenantTheme: headersList.get("x-tenant-theme"),
  };
}
