"use client";

import React from "react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  User,
  Mail,
  Calendar,
  Dumbbell,
  FileText,
  Clock,
  MessageSquare,
} from "lucide-react";
import type { Profile, Routine, RoutineAssignment } from "@/lib/types";
import Link from "next/link";

interface AdminUserDetailProps {
  user: Profile;
}

interface AssignmentWithRoutine extends RoutineAssignment {
  routine: Routine;
}

export function AdminUserDetail({ user }: AdminUserDetailProps) {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [assignments, setAssignments] = useState<AssignmentWithRoutine[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      if (user.role === "trainer") {
        // Fetch routines created by this trainer
        const { data } = await supabase
          .from("routines")
          .select("*")
          .eq("trainer_id", user.id)
          .order("created_at", { ascending: false });

        if (data) {
          setRoutines(data);
        }
      } else if (user.role === "student") {
        // Fetch assignments for this student
        const { data } = await supabase
          .from("routine_assignments")
          .select(
            `
            *,
            routine:routines(*)
          `
          )
          .eq("student_id", user.id);

        if (data) {
          setAssignments(data as AssignmentWithRoutine[]);
        }
      }
      setLoading(false);
    }

    fetchData();
  }, [user, supabase]);

  const memberSince = new Date(user.created_at).toLocaleDateString("es", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Header */}
      <header className="flex items-center gap-4 pt-2">
        <Link href="/dashboard/admin/users">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">Detalle de usuario</h1>
          <p className="text-sm text-muted-foreground">Ver informacion y actividad</p>
        </div>
      </header>

      {/* User Info Card */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-bold">{user.full_name}</h2>
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
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span>{user.email}</span>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <Clock className="w-4 h-4" />
                <span>Miembro desde {memberSince}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Section */}
      {user.role === "trainer" && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Rutinas creadas</h2>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : routines.length === 0 ? (
            <Card className="border-dashed border-2 border-border/50">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Este entrenador aun no ha creado rutinas
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {routines.map((routine) => (
                <Card key={routine.id} className="border-border/50">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Dumbbell className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{routine.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {routine.duration_type === "week"
                          ? "Semanal"
                          : routine.duration_type === "month"
                            ? "Mensual"
                            : "Trimestral"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      {user.role === "student" && (
        <>
          <section>
            <h2 className="text-lg font-semibold mb-4">Planes asignados</h2>
            {loading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : assignments.length === 0 ? (
              <Card className="border-dashed border-2 border-border/50">
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Este alumno no tiene planes asignados
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {assignments.map((assignment) => (
                  <Card key={assignment.id} className="border-border/50">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Dumbbell className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{assignment.routine.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Asignado el{" "}
                          {new Date(assignment.assigned_at).toLocaleDateString(
                            "es"
                          )}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-4">Informes de IA</h2>
            <Card className="border-border/50">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
                  <FileText className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Los informes de IA estaran disponibles proximamente
                </p>
                <Badge variant="secondary">Proximamente</Badge>
              </CardContent>
            </Card>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-4">Comentarios recientes</h2>
            <Card className="border-border/50">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  No hay comentarios recientes de este alumno
                </p>
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
