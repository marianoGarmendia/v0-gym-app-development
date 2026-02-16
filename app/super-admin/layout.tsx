import React from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, LayoutDashboard, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "superadmin") {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-6">
              <Link href="/super-admin" className="font-bold text-lg text-gray-900">
                Super Admin
              </Link>
              <nav className="hidden sm:flex items-center gap-1">
                <Link href="/super-admin">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Button>
                </Link>
                <Link href="/super-admin/gyms">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Building2 className="h-4 w-4" />
                    Gimnasios
                  </Button>
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">{profile.full_name}</span>
              <form action="/auth/logout" method="POST">
                <Button variant="ghost" size="sm">
                  <LogOut className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile nav */}
      <div className="sm:hidden border-b border-gray-200 bg-white px-4 py-2 flex gap-2">
        <Link href="/super-admin" className="flex-1">
          <Button variant="ghost" size="sm" className="w-full gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Button>
        </Link>
        <Link href="/super-admin/gyms" className="flex-1">
          <Button variant="ghost" size="sm" className="w-full gap-2">
            <Building2 className="h-4 w-4" />
            Gimnasios
          </Button>
        </Link>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
