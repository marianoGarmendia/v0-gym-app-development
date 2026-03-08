import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import webpush from "web-push";

// Configure VAPID
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL || "noreply@g10flow.com"}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Verify user is trainer or admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["trainer", "admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const headersList = await headers();
  const tenantId = headersList.get("x-tenant-id");

  if (!tenantId) {
    return NextResponse.json({ error: "Tenant no encontrado" }, { status: 400 });
  }

  const { studentIds, title, body, url } = await request.json();

  if (!studentIds?.length || !title) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  // Get push subscriptions for target students
  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("tenant_id", tenantId)
    .in("user_id", studentIds);

  if (!subscriptions?.length) {
    return NextResponse.json({ sent: 0, message: "Sin suscripciones activas" });
  }

  const payload = JSON.stringify({ title, body, url: url || "/dashboard" });

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload
      );
      sent++;
    } catch (error: any) {
      failed++;
      // Remove expired/invalid subscriptions
      if (error?.statusCode === 410 || error?.statusCode === 404) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", sub.endpoint);
      }
    }
  }

  return NextResponse.json({ sent, failed });
}
