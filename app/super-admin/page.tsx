import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCards } from "@/components/super-admin/stats-cards";
import { RecentGyms } from "@/components/super-admin/recent-gyms";
import { Plus, Building2 } from "lucide-react";

export default function SuperAdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          <Link href="/super-admin/gyms/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Gimnasio
            </Button>
          </Link>
          <Link href="/super-admin/gyms">
            <Button variant="outline" className="gap-2">
              <Building2 className="h-4 w-4" />
              Ver Todos
            </Button>
          </Link>
        </div>
      </div>

      <StatsCards />

      <Card>
        <CardHeader>
          <CardTitle>Gimnasios Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <RecentGyms />
        </CardContent>
      </Card>
    </div>
  );
}
