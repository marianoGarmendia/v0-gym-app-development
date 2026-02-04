"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dumbbell, Calendar, TrendingUp, Trophy } from "lucide-react";
import type { Profile, RoutineAssignment, Routine } from "@/lib/types";
import Link from "next/link";

interface StudentDashboardProps {
  profile: Profile;
}

interface AssignmentWithRoutine extends RoutineAssignment {
  routine: Routine & { trainer: Profile };
}

export function StudentDashboard({ profile }: StudentDashboardProps) {
  const [assignments, setAssignments] = useState<AssignmentWithRoutine[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase
        .from("routine_assignments")
        .select(`
          *,
          routine:routines(
            *,
            trainer:profiles!routines_trainer_id_fkey(*)
          )
        `)
        .eq("student_id", profile.id);

      if (data) {
        setAssignments(data as AssignmentWithRoutine[]);
      }
      setLoading(false);
    }

    fetchData();
  }, [profile.id, supabase]);

  const today = new Date();
  const dayOfWeek = today.toLocaleDateString("es", { weekday: "long" });

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <header className="pt-2">
        <p className="text-muted-foreground text-sm capitalize">{dayOfWeek}</p>
        <h1 className="text-2xl font-bold">Hola, {profile.full_name.split(" ")[0]}</h1>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{assignments.length}</p>
                <p className="text-xs text-muted-foreground">Rutinas activas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <Trophy className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-muted-foreground">Completados hoy</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Routines */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Mis rutinas</h2>
          <Link href="/dashboard/routines" className="text-sm text-primary">
            Ver todas
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        ) : assignments.length === 0 ? (
          <Card className="border-dashed border-2 border-border/50">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Calendar className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-2">Sin rutinas asignadas</h3>
              <p className="text-sm text-muted-foreground">
                Tu entrenador aun no te ha asignado ninguna rutina
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {assignments.map((assignment) => (
              <Link
                key={assignment.id}
                href={`/dashboard/routines/${assignment.routine.id}`}
              >
                <Card className="border-border/50 hover:border-primary/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Dumbbell className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{assignment.routine.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {assignment.routine.trainer.full_name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {assignment.routine.duration_type === "week"
                            ? "Semanal"
                            : assignment.routine.duration_type === "month"
                            ? "Mensual"
                            : "Trimestral"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Acciones rapidas</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/dashboard/routines">
            <Card className="border-border/50 hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="p-4 text-center">
                <Calendar className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">Ver rutinas</p>
              </CardContent>
            </Card>
          </Link>
          <Card className="border-border/50 hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium">Mi progreso</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
