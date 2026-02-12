"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, ClipboardList, Plus, ChevronRight } from "lucide-react";
import type { Profile, Routine, TrainerStudent } from "@/lib/types";
import Link from "next/link";

interface TrainerDashboardProps {
  profile: Profile;
}

interface StudentWithProfile extends TrainerStudent {
  student: Profile;
}

export function TrainerDashboard({ profile }: TrainerDashboardProps) {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [students, setStudents] = useState<StudentWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      const [routinesRes, studentsRes] = await Promise.all([
        supabase
          .from("routines")
          .select("*")
          .eq("trainer_id", profile.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("trainer_students")
          .select(`
            *,
            student:profiles!trainer_students_student_id_fkey(*)
          `)
          .eq("trainer_id", profile.id),
      ]);

      if (routinesRes.data) {
        setRoutines(routinesRes.data);
      }
      if (studentsRes.data) {
        setStudents(studentsRes.data as StudentWithProfile[]);
      }
      setLoading(false);
    }

    fetchData();
  }, [profile.id, supabase]);

  const [dayOfWeek, setDayOfWeek] = useState("");

  useEffect(() => {
    const today = new Date();
    setDayOfWeek(today.toLocaleDateString("es", { weekday: "long" }));
  }, []);

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <header className="pt-2 flex items-start justify-between">
        <div>
          <p className="text-muted-foreground text-sm capitalize">{dayOfWeek}</p>
          <h1 className="text-2xl font-bold">Hola, {profile.full_name.split(" ")[0]}</h1>
        </div>
        <Button asChild size="sm">
          <Link href="/dashboard/routines/new">
            <Plus className="w-4 h-4 mr-1" />
            Nueva rutina
          </Link>
        </Button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{students.length}</p>
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
                <p className="text-2xl font-bold">{routines.length}</p>
                <p className="text-xs text-muted-foreground">Rutinas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Students */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Mis alumnos</h2>
          <Link href="/dashboard/students" className="text-sm text-primary">
            Ver todos
          </Link>
        </div>

        {loading ? (
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-32 rounded-2xl flex-shrink-0" />
            ))}
          </div>
        ) : students.length === 0 ? (
          <Card className="border-dashed border-2 border-border/50">
            <CardContent className="p-6 text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Aun no tienes alumnos asignados
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {students.map((s) => (
              <Link
                key={s.id}
                href={`/dashboard/students/${s.student.id}`}
                className="flex-shrink-0"
              >
                <Card className="w-32 border-border/50 hover:border-primary/50 transition-colors">
                  <CardContent className="p-4 text-center">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      {s.student.full_name.charAt(0)}
                    </div>
                    <p className="text-sm font-medium truncate">{s.student.full_name.split(" ")[0]}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent Routines */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Rutinas recientes</h2>
          <Link href="/dashboard/routines" className="text-sm text-primary">
            Ver todas
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
          </div>
        ) : routines.length === 0 ? (
          <Card className="border-dashed border-2 border-border/50">
            <CardContent className="p-6 text-center">
              <ClipboardList className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                Crea tu primera rutina
              </p>
              <Button asChild size="sm">
                <Link href="/dashboard/routines/new">
                  <Plus className="w-4 h-4 mr-1" />
                  Crear rutina
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {routines.slice(0, 3).map((routine) => (
              <Link key={routine.id} href={`/dashboard/routines/${routine.id}`}>
                <Card className="border-border/50 hover:border-primary/50 transition-colors">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{routine.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {routine.duration_type === "week"
                          ? "Semanal"
                          : routine.duration_type === "month"
                          ? "Mensual"
                          : "Trimestral"}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
