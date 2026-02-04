"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList, Plus, ChevronRight, Users } from "lucide-react";
import type { Profile, Routine } from "@/lib/types";
import Link from "next/link";

interface TrainerRoutinesListProps {
  profile: Profile;
}

interface RoutineWithAssignments extends Routine {
  routine_assignments: { count: number }[];
}

export function TrainerRoutinesList({ profile }: TrainerRoutinesListProps) {
  const [routines, setRoutines] = useState<RoutineWithAssignments[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase
        .from("routines")
        .select(`
          *,
          routine_assignments(count)
        `)
        .eq("trainer_id", profile.id)
        .order("created_at", { ascending: false });

      if (data) {
        setRoutines(data as RoutineWithAssignments[]);
      }
      setLoading(false);
    }

    fetchData();
  }, [profile.id, supabase]);

  return (
    <div className="p-4 space-y-6">
      <header className="pt-2 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mis rutinas</h1>
          <p className="text-muted-foreground text-sm">
            Gestiona las rutinas de tus alumnos
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/routines/new">
            <Plus className="w-4 h-4 mr-1" />
            Nueva
          </Link>
        </Button>
      </header>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : routines.length === 0 ? (
        <Card className="border-dashed border-2 border-border/50">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <ClipboardList className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-2">Sin rutinas</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crea tu primera rutina para comenzar
            </p>
            <Button asChild>
              <Link href="/dashboard/routines/new">
                <Plus className="w-4 h-4 mr-1" />
                Crear rutina
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {routines.map((routine) => (
            <Link key={routine.id} href={`/dashboard/routines/${routine.id}`}>
              <Card className="border-border/50 hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                      <ClipboardList className="w-7 h-7 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">{routine.name}</h3>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>
                          {routine.duration_type === "week"
                            ? "Semanal"
                            : routine.duration_type === "month"
                            ? "Mensual"
                            : "Trimestral"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {routine.routine_assignments?.[0]?.count || 0} alumnos
                        </span>
                      </div>
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
