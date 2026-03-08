import { getTenantContext } from "@/lib/tenant/server";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  const { tenantName } = await getTenantContext();

  return <LoginForm tenantName={tenantName} />;
}
