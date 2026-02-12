"use client";

import React from "react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Dumbbell,
  Shield,
  ClipboardList,
  Plus,
  UserPlus,
  Eye,
  FileText,
} from "lucide-react";
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
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    trainers: 0,
    students: 0,
    routines: 0,
  });
  const [recentUsers, setRecentUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      const [usersRes, routinesRes, recentUsersRes] = await Promise.all([
        supabase.from("profiles").select("role"),
        supabase.from("routines").select("id"),
        supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      if (usersRes.data) {
        const trainers = usersRes.data.filter(
          (u) => u.role === "trainer"
        ).length;
        const students = usersRes.data.filter(
          (u) => u.role === "student"
        ).length;
        setStats({
          totalUsers: usersRes.data.length,
          trainers,
          students,
          routines: routinesRes.data?.length || 0,
        });
      }

      if (recentUsersRes.data) {
        setRecentUsers(recentUsersRes.data);
      }

      setLoading(false);
    }

    fetchData();
  }, [supabase]);

  const [dayOfWeek, setDayOfWeek] = useState("");

  useEffect(() => {
    const today = new Date();
    setDayOfWeek(today.toLocaleDateString("es", { weekday: "long" }));
  }, []);

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Header */}
      <header className="pt-2">
        <p className="text-muted-foreground text-sm capitalize">{dayOfWeek}</p>
        <h1 className="text-2xl font-bold">Panel de Administracion</h1>
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
                  <p className="text-xs text-muted-foreground">
                    Usuarios totales
                  </p>
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
        <h2 className="text-lg font-semibold mb-4">Acciones rapidas</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/dashboard/admin/users/new">
            <Card className="border-primary/50 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer">
              <CardContent className="p-4 text-center">
                <UserPlus className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">Crear usuario</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard/admin/users">
            <Card className="border-border/50 hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="p-4 text-center">
                <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">Ver usuarios</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>

      {/* Recent Users */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Usuarios recientes</h2>
          <Link
            href="/dashboard/admin/users"
            className="text-sm text-primary"
          >
            Ver todos
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : recentUsers.length === 0 ? (
          <Card className="border-dashed border-2 border-border/50">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No hay usuarios registrados
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentUsers.map((user) => (
              <Link
                key={user.id}
                href={`/dashboard/admin/users/${user.id}`}
              >
                <Card className="border-border/50 hover:border-primary/50 transition-colors">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <Users className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{user.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        user.role === "trainer"
                          ? "default"
                          : user.role === "admin"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {user.role === "trainer"
                        ? "Entrenador"
                        : user.role === "admin"
                          ? "Admin"
                          : "Alumno"}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Management Links */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Gestion</h2>
        <div className="space-y-2">
          <Link href="/dashboard/admin/trainers">
            <Card className="border-border/50 hover:border-primary/50 transition-colors">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">Entrenadores</h3>
                  <p className="text-sm text-muted-foreground">
                    Ver y gestionar entrenadores
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard/admin/students">
            <Card className="border-border/50 hover:border-primary/50 transition-colors">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Dumbbell className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">Alumnos</h3>
                  <p className="text-sm text-muted-foreground">
                    Ver y gestionar alumnos
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard/admin/reports">
            <Card className="border-border/50 hover:border-primary/50 transition-colors">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">Informes de IA</h3>
                  <p className="text-sm text-muted-foreground">
                    Ver informes generados
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>
    </div>
  );
}
