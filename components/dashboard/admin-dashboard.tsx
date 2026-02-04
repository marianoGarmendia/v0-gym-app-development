"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Dumbbell, Shield, ClipboardList } from "lucide-react";
import type { Profile } from "@/lib/types";
import Link from "next/link";

interface AdminDashboardProps {
  profile: Profile;
}

interface Stats {
  totalUsers: number;
  trainers: number;
  students: number;
  routines: number;
}

export function AdminDashboard({ profile }: AdminDashboardProps) {
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, trainers: 0, students: 0, routines: 0 });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      const [usersRes, routinesRes] = await Promise.all([
        supabase.from("profiles").select("role"),
        supabase.from("routines").select("id"),
      ]);

      if (usersRes.data) {
        const trainers = usersRes.data.filter((u) => u.role === "trainer").length;
        const students = usersRes.data.filter((u) => u.role === "student").length;
        setStats({
          totalUsers: usersRes.data.length,
          trainers,
          students,
          routines: routinesRes.data?.length || 0,
        });
      }
      setLoading(false);
    }

    fetchData();
  }, [supabase]);

  const today = new Date();
  const dayOfWeek = today.toLocaleDateString("es", { weekday: "long" });

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <header className="pt-2">
        <p className="text-muted-foreground text-sm capitalize">{dayOfWeek}</p>
        <h1 className="text-2xl font-bold">Panel de administracion</h1>
      </header>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-primary/10 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                  <p className="text-xs text-muted-foreground">Usuarios totales</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                  <Shield className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.trainers}</p>
                  <p className="text-xs text-muted-foreground">Entrenadores</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                  <Dumbbell className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.students}</p>
                  <p className="text-xs text-muted-foreground">Alumnos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.routines}</p>
                  <p className="text-xs text-muted-foreground">Rutinas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Gestion</h2>
        <div className="space-y-3">
          <Link href="/dashboard/users">
            <Card className="border-border/50 hover:border-primary/50 transition-colors">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Gestionar usuarios</h3>
                  <p className="text-sm text-muted-foreground">Ver y editar perfiles</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>
    </div>
  );
}
