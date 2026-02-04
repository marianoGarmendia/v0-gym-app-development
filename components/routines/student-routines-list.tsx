"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dumbbell, Calendar, ChevronRight } from "lucide-react";
import type { Profile, RoutineAssignment, Routine } from "@/lib/types";
import Link from "next/link";

interface StudentRoutinesListProps {
  profile: Profile;
}

interface AssignmentWithRoutine extends RoutineAssignment {
  routine: Routine & { trainer: Profile };
}

export function StudentRoutinesList({ profile }: StudentRoutinesListProps) {
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

  return (
    <div className="p-4 space-y-6">
      <header className="pt-2">
        <h1 className="text-2xl font-bold">Mis rutinas</h1>
        <p className="text-muted-foreground text-sm">
          Rutinas asignadas por tus entrenadores
        </p>
      </header>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
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
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Dumbbell className="w-7 h-7 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">
                        {assignment.routine.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {assignment.routine.trainer.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {assignment.routine.duration_type === "week"
                          ? "Semanal"
                          : assignment.routine.duration_type === "month"
                          ? "Mensual"
                          : "Trimestral"}{" "}
                        - Desde{" "}
                        {new Date(assignment.routine.start_date).toLocaleDateString("es")}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
