"use client";

import React from "react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dumbbell,
  Calendar,
  TrendingUp,
  Trophy,
  User,
  Clock,
  FileText,
  ChevronRight,
  Coffee,
} from "lucide-react";
import type { Profile, RoutineAssignment, Routine, WorkoutDay } from "@/lib/types";
import Link from "next/link";

interface StudentDashboardProps {
  profile: Profile;
}

interface AssignmentWithRoutine extends RoutineAssignment {
  routine: Routine & { trainer: Profile };
}

interface TodayWorkout {
  routineId: string;
  routineName: string;
  dayName: string | null;
  exerciseCount: number;
  weekNumber: number;
  dayNumber: number;
}

export function StudentDashboard({ profile }: StudentDashboardProps) {
  const [assignments, setAssignments] = useState<AssignmentWithRoutine[]>([]);
  const [trainers, setTrainers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayWorkout, setTodayWorkout] = useState<TodayWorkout | null>(null);
  const [todayIsRest, setTodayIsRest] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase
        .from("routine_assignments")
        .select(
          `
          *,
          routine:routines(
            *,
            trainer:profiles!routines_trainer_id_fkey(*)
          )
        `
        )
        .eq("student_id", profile.id)
        .eq("visible", true);

      if (data) {
        setAssignments(data as AssignmentWithRoutine[]);
        // Get unique trainers
        const uniqueTrainers = data.reduce(
          (acc: Profile[], curr: AssignmentWithRoutine) => {
            if (
              curr.routine?.trainer &&
              !acc.find((t) => t.id === curr.routine.trainer.id)
            ) {
              acc.push(curr.routine.trainer);
            }
            return acc;
          },
          []
        );
        setTrainers(uniqueTrainers);

        // Calculate today's workout
        await calculateTodayWorkout(data as AssignmentWithRoutine[]);
      }
      setLoading(false);
    }

    async function calculateTodayWorkout(assignmentsData: AssignmentWithRoutine[]) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const assignment of assignmentsData) {
        const routine = assignment.routine;
        const startDate = new Date(routine.start_date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(routine.end_date);
        endDate.setHours(23, 59, 59, 999);

        // Check if today is within the routine date range
        if (today < startDate || today > endDate) continue;

        // Calculate days elapsed since start
        const diffTime = today.getTime() - startDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        // Calculate week and day (1-indexed)
        const weekNumber = Math.floor(diffDays / 7) + 1;
        // Convert to day_number: Monday=1, Sunday=7
        const jsDay = today.getDay(); // 0=Sun, 1=Mon, ...6=Sat
        const dayNumber = jsDay === 0 ? 7 : jsDay;

        // Fetch workout day for today
        const { data: workoutDay } = await supabase
          .from("workout_days")
          .select("*, exercises(*)")
          .eq("routine_id", routine.id)
          .eq("week_number", weekNumber)
          .eq("day_number", dayNumber)
          .single();

        if (workoutDay && workoutDay.exercises?.length > 0) {
          setTodayWorkout({
            routineId: routine.id,
            routineName: routine.name,
            dayName: workoutDay.name,
            exerciseCount: workoutDay.exercises.length,
            weekNumber,
            dayNumber,
          });
          return;
        }

        // If we found a routine for today but no exercises, it's a rest day
        setTodayIsRest(true);
        return;
      }
    }

    fetchData();
  }, [profile.id, supabase]);

  const [dayOfWeek, setDayOfWeek] = useState("");
  const [formattedDate, setFormattedDate] = useState("");

  useEffect(() => {
    const today = new Date();
    setDayOfWeek(today.toLocaleDateString("es", { weekday: "long" }));
    setFormattedDate(today.toLocaleDateString("es", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }));
  }, []);
  const memberSince = new Date(profile.created_at).toLocaleDateString("es", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Header */}
      <header className="pt-2">
        <p className="text-muted-foreground text-sm capitalize">
          {dayOfWeek}, {formattedDate}
        </p>
        <h1 className="text-2xl font-bold">
          Hola, {profile.full_name.split(" ")[0]}
        </h1>
      </header>

      {/* Member Info */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">{profile.full_name}</h3>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>Miembro desde {memberSince}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{assignments.length}</p>
                <p className="text-xs text-muted-foreground">Planes activos</p>
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
                <p className="text-2xl font-bold">{trainers.length}</p>
                <p className="text-xs text-muted-foreground">Entrenadores</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Workout */}
      {!loading && todayWorkout && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Tu entrenamiento de hoy</h2>
          <Link
            href={`/dashboard/routines/${todayWorkout.routineId}?week=${todayWorkout.weekNumber}&day=${todayWorkout.dayNumber}`}
          >
            <Card className="bg-gradient-to-br from-primary/15 to-primary/5 border-primary/30 hover:border-primary/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                    <Dumbbell className="w-7 h-7 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {todayWorkout.dayName && (
                      <h3 className="font-semibold truncate">{todayWorkout.dayName}</h3>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {todayWorkout.routineName}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {todayWorkout.exerciseCount} ejercicios
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </section>
      )}

      {!loading && !todayWorkout && todayIsRest && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Tu entrenamiento de hoy</h2>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Coffee className="w-7 h-7 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold">Dia de descanso</h3>
                  <p className="text-sm text-muted-foreground">
                    No hay ejercicios programados para hoy
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Trainers Section */}
      {trainers.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Mis entrenadores</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {trainers.map((trainer) => (
              <Card
                key={trainer.id}
                className="border-border/50 min-w-[160px] shrink-0"
              >
                <CardContent className="p-4 text-center">
                  <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-2">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <p className="font-medium text-sm truncate">
                    {trainer.full_name}
                  </p>
                  <Badge variant="secondary" className="mt-2 text-xs">
                    Entrenador
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Active Plans */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Mis planes de entrenamiento</h2>
          {assignments.length > 0 && (
            <Link href="/dashboard/routines" className="text-sm text-primary">
              Ver todos
            </Link>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>
        ) : assignments.length === 0 ? (
          <Card className="border-dashed border-2 border-border/50">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Calendar className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-2">Sin planes asignados</h3>
              <p className="text-sm text-muted-foreground">
                Tu entrenador aun no te ha asignado ninguna rutina. Contactalo
                para comenzar tu entrenamiento.
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
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Dumbbell className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">
                          {assignment.routine.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Por {assignment.routine.trainer.full_name}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {assignment.routine.duration_type === "week"
                              ? "Semanal"
                              : assignment.routine.duration_type === "month"
                                ? "Mensual"
                                : "Trimestral"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(
                              assignment.routine.start_date
                            ).toLocaleDateString("es", {
                              day: "numeric",
                              month: "short",
                            })}{" "}
                            -{" "}
                            {new Date(
                              assignment.routine.end_date
                            ).toLocaleDateString("es", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Progress Section */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Progresos e informes</h2>
        <Card className="border-border/50">
          <CardContent className="p-6 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <FileText className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-2">Informes de progreso</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Aqui podras ver los informes generados por IA sobre tu evolucion y
              rendimiento.
            </p>
            <Badge variant="secondary">Proximamente</Badge>
          </CardContent>
        </Card>
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Acciones rapidas</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/dashboard/routines">
            <Card className="border-border/50 hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="p-4 text-center">
                <Calendar className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">Ver planes</p>
              </CardContent>
            </Card>
          </Link>
          <Card className="border-border/50 opacity-60">
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Mi progreso</p>
              <p className="text-xs text-muted-foreground">Pronto</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
