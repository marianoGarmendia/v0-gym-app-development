import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const headersList = await headers();
  const tenantId = headersList.get("x-tenant-id");

  if (!tenantId) {
    return NextResponse.json({ error: "Tenant no encontrado" }, { status: 400 });
  }

  const { endpoint, p256dh, auth } = await request.json();

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  // Upsert subscription (endpoint is unique)
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        tenant_id: tenantId,
        user_id: user.id,
        endpoint,
        p256dh,
        auth,
      },
      { onConflict: "endpoint" }
    );

  if (error) {
    return NextResponse.json({ error: "Error al guardar suscripción" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
