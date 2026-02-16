"use client";

import { useState, useEffect, useCallback } from "react";
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
  UserPlus,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import type { Profile, Routine, WorkoutDay, Exercise, ExerciseCompletion } from "@/lib/types";
import Link from "next/link";
import { ExerciseCard } from "./exercise-card";
import { WeekCommentModal } from "./week-comment-modal";
import { DayCommentModal } from "./day-comment-modal";
import { toast } from "sonner";

interface TrainerStudent {
  student_id: string;
  student: { id: string; full_name: string; email: string };
}

interface RoutineViewerProps {
  routine: Routine & {
    trainer: Profile;
    workout_days: (WorkoutDay & { exercises: Exercise[] })[];
  };
  profile: Profile;
  trainerStudents?: TrainerStudent[];
  assignedStudentIds?: string[];
  initialWeek?: number;
  initialDay?: number;
}

export function RoutineViewer({ routine, profile, trainerStudents = [], assignedStudentIds = [], initialWeek, initialDay }: RoutineViewerProps) {
  const [selectedWeek, setSelectedWeek] = useState(initialWeek || 1);
  const [selectedDay, setSelectedDay] = useState(initialDay || 1);
  const [completions, setCompletions] = useState<Record<string, ExerciseCompletion>>({});
  const [loading, setLoading] = useState(true);
  const [weekCommentOpen, setWeekCommentOpen] = useState(false);
  const [dayCommentOpen, setDayCommentOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  // Comments state
  interface CommentData {
    id: string;
    content: string;
    created_at: string;
    comment_type: string;
    routine_id?: string;
    week_number?: number;
    workout_day_id?: string;
    exercise_id?: string;
  }
  const [weekComments, setWeekComments] = useState<CommentData[]>([]);
  const [dayComments, setDayComments] = useState<Record<string, CommentData[]>>({});
  const [exerciseComments, setExerciseComments] = useState<Record<string, CommentData[]>>({});
  const [selectedStudents, setSelectedStudents] = useState<string[]>(assignedStudentIds);
  const [savingAssignments, setSavingAssignments] = useState(false);
  const supabase = createClient();

  const toggleStudent = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSaveAssignments = async () => {
    setSavingAssignments(true);
    try {
      const currentSet = new Set(assignedStudentIds);
      const newSet = new Set(selectedStudents);

      // Add new assignments
      for (const studentId of newSet) {
        if (!currentSet.has(studentId)) {
          await supabase.from("routine_assignments").insert({
            routine_id: routine.id,
            student_id: studentId,
          });
        }
      }

      // Remove unselected assignments
      for (const studentId of currentSet) {
        if (!newSet.has(studentId)) {
          await supabase
            .from("routine_assignments")
            .delete()
            .eq("routine_id", routine.id)
            .eq("student_id", studentId);
        }
      }

      toast.success("Alumnos actualizados");
      setAssignModalOpen(false);
    } catch {
      toast.error("Error al actualizar alumnos");
    }
    setSavingAssignments(false);
  };

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
        data.forEach((c: any) => {
          completionsMap[c.exercise_id] = c;
        });
        setCompletions(completionsMap);
      }
      setLoading(false);
    }

    fetchCompletions();
  }, [profile.id, profile.role, routine.workout_days, supabase]);

  // Fetch comments for current week
  const fetchComments = useCallback(async () => {
    if (profile.role !== "student") return;

    const weekWorkoutDays = routine.workout_days.filter(
      (wd) => wd.week_number === selectedWeek
    );
    const workoutDayIds = weekWorkoutDays.map((wd) => wd.id);
    const exerciseIds = weekWorkoutDays.flatMap((wd) =>
      wd.exercises.map((e) => e.id)
    );

    // Fetch week comments
    const { data: weekData } = await supabase
      .from("comments")
      .select("id, content, created_at, comment_type")
      .eq("comment_type", "week")
      .eq("routine_id", routine.id)
      .eq("week_number", selectedWeek)
      .eq("student_id", profile.id)
      .order("created_at", { ascending: true });

    setWeekComments(weekData || []);

    // Fetch day comments
    if (workoutDayIds.length > 0) {
      const { data: dayData } = await supabase
        .from("comments")
        .select("id, content, created_at, comment_type, workout_day_id")
        .eq("comment_type", "day")
        .eq("routine_id", routine.id)
        .in("workout_day_id", workoutDayIds)
        .eq("student_id", profile.id)
        .order("created_at", { ascending: true });

      const dayMap: Record<string, CommentData[]> = {};
      (dayData || []).forEach((c: CommentData & { workout_day_id?: string }) => {
        if (c.workout_day_id) {
          if (!dayMap[c.workout_day_id]) dayMap[c.workout_day_id] = [];
          dayMap[c.workout_day_id].push(c);
        }
      });
      setDayComments(dayMap);
    } else {
      setDayComments({});
    }

    // Fetch exercise comments
    if (exerciseIds.length > 0) {
      const { data: exData } = await supabase
        .from("comments")
        .select("id, content, created_at, comment_type, exercise_id")
        .eq("comment_type", "exercise")
        .eq("routine_id", routine.id)
        .in("exercise_id", exerciseIds)
        .eq("student_id", profile.id)
        .order("created_at", { ascending: true });

      const exMap: Record<string, CommentData[]> = {};
      (exData || []).forEach((c: CommentData & { exercise_id?: string }) => {
        if (c.exercise_id) {
          if (!exMap[c.exercise_id]) exMap[c.exercise_id] = [];
          exMap[c.exercise_id].push(c);
        }
      });
      setExerciseComments(exMap);
    } else {
      setExerciseComments({});
    }
  }, [profile.id, profile.role, routine.id, routine.workout_days, selectedWeek, supabase]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId)
      .eq("student_id", profile.id);

    if (error) {
      toast.error("Error al eliminar comentario");
    } else {
      toast.success("Comentario eliminado");
      fetchComments();
    }
  };

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
              <div className="flex gap-2">
                {trainerStudents.length > 0 && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => setAssignModalOpen(true)}
                  >
                    <UserPlus className="w-4 h-4" />
                  </Button>
                )}
                <Link href={`/dashboard/routines/${routine.id}/edit`}>
                  <Button variant="outline" size="icon" className="shrink-0">
                    <Pencil className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
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
            const workoutDay = routine.workout_days.find(
              (wd) => wd.week_number === selectedWeek && wd.day_number === day
            );
            const hasWorkout = !!workoutDay;

            // Calculate completion status for this day
            let completionStatus: "none" | "partial" | "completed" = "none";
            if (profile.role === "student" && workoutDay && workoutDay.exercises.length > 0) {
              const dayCompletedCount = workoutDay.exercises.filter((e) => completions[e.id]).length;
              if (dayCompletedCount === workoutDay.exercises.length) {
                completionStatus = "completed";
              } else if (dayCompletedCount > 0) {
                completionStatus = "partial";
              }
            }

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
                {profile.role === "student" && hasWorkout && (
                  <span
                    className={cn(
                      "block w-1.5 h-1.5 rounded-full mx-auto mt-1",
                      completionStatus === "completed" && "bg-green-500",
                      completionStatus === "partial" && "bg-yellow-500",
                      completionStatus === "none" && "bg-transparent"
                    )}
                  />
                )}
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
                  routineId={routine.id}
                  onCompletionChange={handleCompletionChange}
                  comments={exerciseComments[exercise.id]}
                  onCommentSaved={fetchComments}
                />
              ))}
            </div>

            {/* Day comments */}
            {currentWorkoutDay && dayComments[currentWorkoutDay.id]?.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Comentarios del dia</p>
                {dayComments[currentWorkoutDay.id].map((c) => (
                  <div key={c.id} className="bg-muted/50 rounded-xl p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm flex-1">{c.content}</p>
                      {profile.role === "student" && (
                        <button
                          onClick={() => handleDeleteComment(c.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors shrink-0 p-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(c.created_at).toLocaleDateString("es-AR", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}

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

            {/* Week comments */}
            {weekComments.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Comentarios de la semana</p>
                {weekComments.map((c) => (
                  <div key={c.id} className="bg-muted/50 rounded-xl p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm flex-1">{c.content}</p>
                      {profile.role === "student" && (
                        <button
                          onClick={() => handleDeleteComment(c.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors shrink-0 p-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(c.created_at).toLocaleDateString("es-AR", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Assign students modal */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar alumnos</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {trainerStudents.map((ts) => (
              <div key={ts.student_id} className="flex items-center gap-3">
                <Checkbox
                  id={`assign-${ts.student_id}`}
                  checked={selectedStudents.includes(ts.student_id)}
                  onCheckedChange={() => toggleStudent(ts.student_id)}
                />
                <label
                  htmlFor={`assign-${ts.student_id}`}
                  className="text-sm font-medium cursor-pointer"
                >
                  {ts.student.full_name}
                </label>
              </div>
            ))}
          </div>
          <Button
            onClick={handleSaveAssignments}
            disabled={savingAssignments}
            className="w-full"
          >
            {savingAssignments ? "Guardando..." : "Guardar"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Modals */}
      <WeekCommentModal
        open={weekCommentOpen}
        onOpenChange={setWeekCommentOpen}
        routineId={routine.id}
        weekNumber={selectedWeek}
        studentId={profile.id}
        onCommentSaved={fetchComments}
      />
      <DayCommentModal
        open={dayCommentOpen}
        onOpenChange={setDayCommentOpen}
        workoutDayId={currentWorkoutDay?.id || ""}
        studentId={profile.id}
        routineId={routine.id}
        onCommentSaved={fetchComments}
      />
    </div>
  );
}
