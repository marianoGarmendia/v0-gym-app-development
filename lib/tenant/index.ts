export interface Tenant {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  theme: Record<string, string> | null;
  logo_url: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Root domain from env (e.g., "tuapp.com" or "lvh.me:3000")
export const APP_ROOT_DOMAIN = process.env.APP_ROOT_DOMAIN || "lvh.me:3000";

/**
 * Extract tenant slug from Host header.
 *
 * Production: gimnasio.tuapp.com → "gimnasio"
 * Dev:        gimnasio.localhost:3000 → "gimnasio"
 *             gimnasio.lvh.me:3000 → "gimnasio"
 * Root:       tuapp.com → null
 * Ignores:    www.
 */
export function extractTenantSlug(host: string | null): string | null {
  if (!host) return null;

  // Remove www. prefix
  const cleanHost = host.replace(/^www\./, "");

  // Remove port for comparison if root domain already includes port
  const rootDomain = APP_ROOT_DOMAIN.replace(/^www\./, "");

  // If host equals root domain exactly, no tenant
  if (cleanHost === rootDomain) return null;

  // Check if host ends with .rootDomain
  const suffix = `.${rootDomain}`;
  if (!cleanHost.endsWith(suffix)) {
    // Also handle localhost:3000 style (gimnasio.localhost:3000)
    const localhostMatch = cleanHost.match(/^([^.]+)\.localhost(:\d+)?$/);
    if (localhostMatch) return localhostMatch[1];
    return null;
  }

  // Extract subdomain: "gimnasio.tuapp.com" → "gimnasio"
  const slug = cleanHost.slice(0, -suffix.length);
  if (!slug || slug.includes(".")) return null; // no nested subdomains

  return slug;
}
