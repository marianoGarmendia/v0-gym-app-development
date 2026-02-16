"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, Activity, UserPlus } from "lucide-react";

interface Stats {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  usersThisMonth: number;
}

export function StatsCards() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/super-admin/stats")
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    {
      title: "Total Gimnasios",
      value: stats?.totalTenants,
      icon: Building2,
    },
    {
      title: "Gimnasios Activos",
      value: stats?.activeTenants,
      icon: Activity,
    },
    {
      title: "Total Usuarios",
      value: stats?.totalUsers,
      icon: Users,
    },
    {
      title: "Usuarios este mes",
      value: stats?.usersThisMonth,
      icon: UserPlus,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold">{card.value}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
