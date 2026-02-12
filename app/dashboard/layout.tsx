import React from "react"
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { ChatButton } from "@/components/chat-button";

/*
Layout siempre se ejecuta antes que Page?

  Sí, siempre. Es la arquitectura de Next.js App Router:

  Request a /dashboard
    │
    ▼
    middleware.ts              ← primero
    │
    ▼
    app/dashboard/layout.tsx   ← segundo (envuelve a la page)
    │
    ▼
    app/dashboard/page.tsx     ← tercero (se renderiza DENTRO del layout)

  El layout es un wrapper. El {children} en el layout es donde se inyecta la
  page:

  // layout.tsx
  return (
    <div className="min-h-screen bg-background pb-20">
      {children}           ← acá va el resultado de page.tsx
      <BottomNav />
      <ChatButton />
    </div>
  );

  Si tuvieras layouts anidados (por ejemplo app/layout.tsx +
  app/dashboard/layout.tsx), se ejecutan de afuera hacia adentro: root layout →
  dashboard layout → page.
*/

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {children}
      <BottomNav role={profile.role} />
      <ChatButton profile={profile} />
    </div>
  );
}
