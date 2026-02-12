"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Check,
  MessageSquare,
  ExternalLink,
  Pencil,
} from "lucide-react";
import type { Profile, Routine, WorkoutDay, Exercise, ExerciseCompletion } from "@/lib/types";
import Link from "next/link";
import { ExerciseCard } from "./exercise-card";
import { WeekCommentModal } from "./week-comment-modal";
import { DayCommentModal } from "./day-comment-modal";

interface RoutineViewerProps {
  routine: Routine & {
    trainer: Profile;
    workout_days: (WorkoutDay & { exercises: Exercise[] })[];
  };
  profile: Profile;
}

export function RoutineViewer({ routine, profile }: RoutineViewerProps) {
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedDay, setSelectedDay] = useState(1);
  const [completions, setCompletions] = useState<Record<string, ExerciseCompletion>>({});
  const [loading, setLoading] = useState(true);
  const [weekCommentOpen, setWeekCommentOpen] = useState(false);
  const [dayCommentOpen, setDayCommentOpen] = useState(false);
  const supabase = createClient();

  // Calculate total weeks based on duration
  const getTotalWeeks = () => {
    switch (routine.duration_type) {
      case "week":
        return 1;
      case "month":
        return 4;
      case "trimester":
        return 12;
      default:
        return 1;
    }
  };

  const totalWeeks = getTotalWeeks();
  const daysInWeek = [1, 2, 3, 4, 5, 6, 7];
  const dayNames = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];

  // Get workout day for current selection
  const currentWorkoutDay = routine.workout_days.find(
    (wd) => wd.week_number === selectedWeek && wd.day_number === selectedDay
  );

  // Fetch completions for student
  useEffect(() => {
    async function fetchCompletions() {
      if (profile.role !== "student") {
        setLoading(false);
        return;
      }

      const exerciseIds = routine.workout_days
        .flatMap((wd) => wd.exercises.map((e) => e.id));

      if (exerciseIds.length === 0) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("exercise_completions")
        .select("*")
        .eq("student_id", profile.id)
        .in("exercise_id", exerciseIds);

      if (data) {
        const completionsMap: Record<string, ExerciseCompletion> = {};
        data.forEach((c) => {
          completionsMap[c.exercise_id] = c;
        });
        setCompletions(completionsMap);
      }
      setLoading(false);
    }

    fetchCompletions();
  }, [profile.id, profile.role, routine.workout_days, supabase]);

  const handlePrevWeek = () => {
    if (selectedWeek > 1) {
      setSelectedWeek(selectedWeek - 1);
    }
  };

  const handleNextWeek = () => {
    if (selectedWeek < totalWeeks) {
      setSelectedWeek(selectedWeek + 1);
    }
  };

  const handleCompletionChange = (exerciseId: string, completion: ExerciseCompletion | null) => {
    setCompletions((prev) => {
      const newCompletions = { ...prev };
      if (completion) {
        newCompletions[exerciseId] = completion;
      } else {
        delete newCompletions[exerciseId];
      }
      return newCompletions;
    });
  };

  const exercises = currentWorkoutDay?.exercises.sort((a, b) => a.order_index - b.order_index) || [];
  const completedCount = exercises.filter((e) => completions[e.id]).length;

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          <Link href="/dashboard/routines">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="font-bold text-lg truncate">{routine.name}</h1>
            <p className="text-sm text-muted-foreground truncate">
              {routine.trainer.full_name}
            </p>
          </div>
          {((profile.role === "trainer" && routine.trainer_id === profile.id) ||
            profile.role === "admin") && (
              <Link href={`/dashboard/routines/${routine.id}/edit`}>
                <Button variant="outline" size="icon" className="shrink-0">
                  <Pencil className="w-4 h-4" />
                </Button>
              </Link>
            )}
        </div>

        {/* Week navigation */}
        {totalWeeks > 1 && (
          <div className="flex items-center justify-between mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevWeek}
              disabled={selectedWeek === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-center">
              <span className="font-semibold">Semana {selectedWeek}</span>
              <span className="text-muted-foreground text-sm"> / {totalWeeks}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextWeek}
              disabled={selectedWeek === totalWeeks}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Day tabs */}
        <div className="flex gap-1 overflow-x-auto scrollbar-hide -mx-1 px-1">
          {daysInWeek.map((day, index) => {
            const hasWorkout = routine.workout_days.some(
              (wd) => wd.week_number === selectedWeek && wd.day_number === day
            );
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={cn(
                  "flex-1 min-w-[44px] py-2 px-2 rounded-xl text-center transition-all",
                  selectedDay === day
                    ? "bg-primary text-primary-foreground"
                    : hasWorkout
                    ? "bg-card hover:bg-muted"
                    : "bg-transparent text-muted-foreground"
                )}
              >
                <span className="text-xs font-medium block">{dayNames[index]}</span>
                <span className="text-lg font-bold block">{day}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Content */}
      <div className="p-4 space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-2xl" />
            ))}
          </div>
        ) : !currentWorkoutDay || exercises.length === 0 ? (
          <Card className="border-dashed border-2 border-border/50">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Play className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-2">Dia de descanso</h3>
              <p className="text-sm text-muted-foreground">
                No hay ejercicios programados para este dia
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Progress */}
            {profile.role === "student" && (
              <div className="flex items-center justify-between bg-card rounded-2xl p-4 border border-border/50">
                <div>
                  <p className="text-sm text-muted-foreground">Progreso del dia</p>
                  <p className="text-2xl font-bold">
                    {completedCount} / {exercises.length}
                  </p>
                </div>
                <div className="w-16 h-16 relative">
                  <svg className="w-full h-full -rotate-90">
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="6"
                      className="text-muted"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="6"
                      strokeDasharray={`${(completedCount / exercises.length) * 176} 176`}
                      className="text-primary"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    {completedCount === exercises.length ? (
                      <Check className="w-6 h-6 text-primary" />
                    ) : (
                      <span className="text-sm font-bold">
                        {Math.round((completedCount / exercises.length) * 100)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Workout day name */}
            {currentWorkoutDay.name && (
              <h2 className="text-xl font-semibold">{currentWorkoutDay.name}</h2>
            )}

            {/* Exercises */}
            <div className="space-y-3">
              {exercises.map((exercise) => (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  completion={completions[exercise.id]}
                  isStudent={profile.role === "student"}
                  studentId={profile.id}
                  onCompletionChange={handleCompletionChange}
                />
              ))}
            </div>

            {/* Comments section */}
            {profile.role === "student" && (
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1 bg-transparent"
                  onClick={() => setDayCommentOpen(true)}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Comentar dia
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 bg-transparent"
                  onClick={() => setWeekCommentOpen(true)}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Comentar semana
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <WeekCommentModal
        open={weekCommentOpen}
        onOpenChange={setWeekCommentOpen}
        routineId={routine.id}
        weekNumber={selectedWeek}
        studentId={profile.id}
      />
      <DayCommentModal
        open={dayCommentOpen}
        onOpenChange={setDayCommentOpen}
        workoutDayId={currentWorkoutDay?.id || ""}
        studentId={profile.id}
      />
    </div>
  );
}
