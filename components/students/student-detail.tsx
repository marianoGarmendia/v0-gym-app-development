"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Mail,
  Calendar,
  Dumbbell,
  MessageSquare,
} from "lucide-react";
import type { Profile } from "@/lib/types";
import Link from "next/link";
import { toast } from "sonner";

interface RoutineInfo {
  id: string;
  name: string;
  description: string | null;
  duration_type: string;
}

interface AssignmentWithRoutine {
  id: string;
  routine_id: string;
  student_id: string;
  assigned_at: string;
  visible: boolean;
  routine: RoutineInfo;
}

interface StudentComment {
  id: string;
  comment_type: "week" | "day" | "exercise";
  content: string;
  created_at: string;
  routine_id: string | null;
  week_number: number | null;
  workout_day_id: string | null;
  exercise_id: string | null;
  // Joined data
  routine_name?: string;
  day_name?: string;
  day_number?: number;
  exercise_name?: string;
}

interface ExerciseCompletionData {
  id: string;
  exercise_id: string;
  completed_at: string;
  actual_sets: number | null;
  actual_reps: string | null;
  actual_weight: string | null;
  exercise_name: string;
  routine_name: string;
}

interface StudentDetailProps {
  student: Profile;
  trainerRoutines: RoutineInfo[];
  initialAssignments: AssignmentWithRoutine[];
}

export function StudentDetail({
  student,
  trainerRoutines,
  initialAssignments,
}: StudentDetailProps) {
  const router = useRouter();
  const supabase = createClient();
  const [assignments, setAssignments] = useState(initialAssignments);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedRoutines, setSelectedRoutines] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [comments, setComments] = useState<StudentComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [completionsWithData, setCompletionsWithData] = useState<ExerciseCompletionData[]>([]);
  // Map exercise_id -> completion data for showing in exercise comments
  const [completionsByExercise, setCompletionsByExercise] = useState<Record<string, ExerciseCompletionData>>({});

  useEffect(() => {
    async function fetchComments() {
      // Fetch all comment types with joins to get context
      const [weekRes, dayRes, exerciseRes] = await Promise.all([
        // Week comments - have routine_id directly
        supabase
          .from("comments")
          .select("*, routine:routines(name)")
          .eq("student_id", student.id)
          .eq("comment_type", "week")
          .order("created_at", { ascending: false }),
        // Day comments - join through workout_day -> routine
        supabase
          .from("comments")
          .select("*, workout_day:workout_days(name, day_number, routine:routines(name))")
          .eq("student_id", student.id)
          .eq("comment_type", "day")
          .order("created_at", { ascending: false }),
        // Exercise comments - join through exercise -> workout_day -> routine
        supabase
          .from("comments")
          .select("*, exercise:exercises(name, workout_day:workout_days(routine:routines(name)))")
          .eq("student_id", student.id)
          .eq("comment_type", "exercise")
          .order("created_at", { ascending: false }),
      ]);

      const allComments: StudentComment[] = [];

      // Process week comments
      (weekRes.data || []).forEach((c: any) => {
        allComments.push({
          id: c.id,
          comment_type: "week",
          content: c.content,
          created_at: c.created_at,
          routine_id: c.routine_id,
          week_number: c.week_number,
          workout_day_id: null,
          exercise_id: null,
          routine_name: c.routine?.name,
        });
      });

      // Process day comments
      (dayRes.data || []).forEach((c: any) => {
        allComments.push({
          id: c.id,
          comment_type: "day",
          content: c.content,
          created_at: c.created_at,
          routine_id: null,
          week_number: null,
          workout_day_id: c.workout_day_id,
          exercise_id: null,
          routine_name: c.workout_day?.routine?.name,
          day_name: c.workout_day?.name,
          day_number: c.workout_day?.day_number,
        });
      });

      // Process exercise comments
      (exerciseRes.data || []).forEach((c: any) => {
        allComments.push({
          id: c.id,
          comment_type: "exercise",
          content: c.content,
          created_at: c.created_at,
          routine_id: null,
          week_number: null,
          workout_day_id: null,
          exercise_id: c.exercise_id,
          exercise_name: c.exercise?.name,
          routine_name: c.exercise?.workout_day?.routine?.name,
        });
      });

      // Sort by date, newest first
      allComments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setComments(allComments);
      setLoadingComments(false);
    }

    async function fetchCompletions() {
      const { data } = await supabase
        .from("exercise_completions")
        .select("*, exercise:exercises(name, workout_day:workout_days(routine:routines(name)))")
        .eq("student_id", student.id)
        .order("completed_at", { ascending: false });

      if (data) {
        const mapped: ExerciseCompletionData[] = [];
        const byExercise: Record<string, ExerciseCompletionData> = {};

        data.forEach((c: any) => {
          const item: ExerciseCompletionData = {
            id: c.id,
            exercise_id: c.exercise_id,
            completed_at: c.completed_at,
            actual_sets: c.actual_sets,
            actual_reps: c.actual_reps,
            actual_weight: c.actual_weight,
            exercise_name: c.exercise?.name || "Ejercicio",
            routine_name: c.exercise?.workout_day?.routine?.name || "",
          };

          byExercise[c.exercise_id] = item;

          // Only include in the "with data" list if they registered actual values
          if (c.actual_sets || c.actual_reps || c.actual_weight) {
            mapped.push(item);
          }
        });

        setCompletionsWithData(mapped);
        setCompletionsByExercise(byExercise);
      }
    }

    fetchComments();
    fetchCompletions();
  }, [student.id, supabase]);

  const assignedRoutineIds = assignments.map((a) => a.routine_id);
  const availableRoutines = trainerRoutines.filter(
    (r) => !assignedRoutineIds.includes(r.id)
  );

  const getCommentLabel = (comment: StudentComment) => {
    switch (comment.comment_type) {
      case "week":
        return `Semana ${comment.week_number}${comment.routine_name ? ` - ${comment.routine_name}` : ""}`;
      case "day": {
        const dayLabel = comment.day_name || (comment.day_number ? `Dia ${comment.day_number}` : "Dia");
        return `${dayLabel}${comment.routine_name ? ` - ${comment.routine_name}` : ""}`;
      }
      case "exercise":
        return `${comment.exercise_name || "Ejercicio"}${comment.routine_name ? ` - ${comment.routine_name}` : ""}`;
    }
  };

  const getCommentTypeLabel = (type: string) => {
    switch (type) {
      case "week": return "Semana";
      case "day": return "Dia";
      case "exercise": return "Ejercicio";
      default: return type;
    }
  };

  const getDurationLabel = (type: string) => {
    switch (type) {
      case "week": return "Semanal";
      case "month": return "Mensual";
      case "trimester": return "Trimestral";
      default: return type;
    }
  };

  const toggleVisibility = async (assignmentId: string, currentVisible: boolean) => {
    const { error } = await supabase
      .from("routine_assignments")
      .update({ visible: !currentVisible })
      .eq("id", assignmentId);

    if (error) {
      toast.error("Error al actualizar visibilidad");
      return;
    }

    setAssignments((prev) =>
      prev.map((a) =>
        a.id === assignmentId ? { ...a, visible: !currentVisible } : a
      )
    );
    toast.success(currentVisible ? "Rutina ocultada al alumno" : "Rutina visible para el alumno");
  };

  const handleUnassign = async (assignmentId: string, routineName: string) => {
    const { error } = await supabase
      .from("routine_assignments")
      .delete()
      .eq("id", assignmentId);

    if (error) {
      toast.error("Error al desasignar rutina");
      return;
    }

    setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
    toast.success(`"${routineName}" desasignada`);
  };

  const handleAssignRoutines = async () => {
    if (selectedRoutines.length === 0) return;
    setAssigning(true);

    const insertData = selectedRoutines.map((routineId) => ({
      routine_id: routineId,
      student_id: student.id,
      visible: true,
    }));

    const { data, error } = await supabase
      .from("routine_assignments")
      .insert(insertData)
      .select(`
        id,
        routine_id,
        student_id,
        assigned_at,
        visible,
        routine:routines(id, name, description, duration_type)
      `);

    if (error) {
      toast.error("Error al asignar rutinas");
      setAssigning(false);
      return;
    }

    if (data) {
      setAssignments((prev) => [...prev, ...(data as unknown as AssignmentWithRoutine[])]);
    }

    toast.success(`${selectedRoutines.length} rutina(s) asignada(s)`);
    setAssignDialogOpen(false);
    setSelectedRoutines([]);
    setAssigning(false);
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/students">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="font-bold text-lg">Detalle del alumno</h1>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Student Profile Card */}
        <Card className="border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl shrink-0">
                {student.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold truncate">{student.full_name}</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{student.email}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>Miembro desde {new Date(student.created_at).toLocaleDateString("es")}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assigned Routines Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Rutinas asignadas</h2>
            <Button size="sm" onClick={() => setAssignDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Asignar
            </Button>
          </div>

          {assignments.length === 0 ? (
            <Card className="border-dashed border-2 border-border/50">
              <CardContent className="p-8 text-center">
                <Dumbbell className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No hay rutinas asignadas a este alumno
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {assignments.map((assignment) => (
                <Card
                  key={assignment.id}
                  className={`border-border/50 transition-opacity ${
                    !assignment.visible ? "opacity-50" : ""
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Dumbbell className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link href={`/dashboard/routines/${assignment.routine_id}`}>
                          <h3 className="font-semibold truncate hover:text-primary transition-colors">
                            {assignment.routine.name}
                          </h3>
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {getDurationLabel(assignment.routine.duration_type)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            toggleVisibility(assignment.id, assignment.visible)
                          }
                          title={
                            assignment.visible
                              ? "Ocultar al alumno"
                              : "Mostrar al alumno"
                          }
                        >
                          {assignment.visible ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-muted-foreground" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            handleUnassign(assignment.id, assignment.routine.name)
                          }
                          title="Desasignar rutina"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Comments Section */}
        <div>
          <h2 className="text-lg font-semibold mb-4">
            <MessageSquare className="w-5 h-5 inline-block mr-2" />
            Comentarios del alumno
          </h2>

          {loadingComments ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-muted/50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : comments.length === 0 ? (
            <Card className="border-dashed border-2 border-border/50">
              <CardContent className="p-8 text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Este alumno aun no dejo comentarios
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => {
                const exerciseCompletion =
                  comment.comment_type === "exercise" && comment.exercise_id
                    ? completionsByExercise[comment.exercise_id]
                    : null;

                return (
                  <Card key={comment.id} className="border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                          <MessageSquare className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                              {getCommentTypeLabel(comment.comment_type)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(comment.created_at).toLocaleDateString("es", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">
                            {getCommentLabel(comment)}
                          </p>
                          {/* Show actual performance data for exercise comments */}
                          {exerciseCompletion &&
                            (exerciseCompletion.actual_sets ||
                              exerciseCompletion.actual_reps ||
                              exerciseCompletion.actual_weight) && (
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <Dumbbell className="w-3.5 h-3.5 text-primary" />
                                <span className="text-xs text-primary font-medium">
                                  Realizado:{" "}
                                  {[
                                    exerciseCompletion.actual_sets &&
                                      `${exerciseCompletion.actual_sets} series`,
                                    exerciseCompletion.actual_reps &&
                                      `${exerciseCompletion.actual_reps} reps`,
                                    exerciseCompletion.actual_weight &&
                                      `${exerciseCompletion.actual_weight}`,
                                  ]
                                    .filter(Boolean)
                                    .join(" x ")}
                                </span>
                              </div>
                            )}
                          <p className="text-sm">{comment.content}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Exercise Performance Log */}
        {completionsWithData.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">
              <Dumbbell className="w-5 h-5 inline-block mr-2" />
              Registro de entrenamiento
            </h2>
            <div className="space-y-3">
              {completionsWithData.map((comp) => (
                <Card key={comp.id} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Dumbbell className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{comp.exercise_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comp.completed_at).toLocaleDateString("es", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {comp.routine_name && (
                          <p className="text-xs text-muted-foreground mb-1.5">{comp.routine_name}</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {comp.actual_sets && (
                            <Badge variant="secondary" className="text-xs">
                              {comp.actual_sets} series
                            </Badge>
                          )}
                          {comp.actual_reps && (
                            <Badge variant="secondary" className="text-xs">
                              {comp.actual_reps} reps
                            </Badge>
                          )}
                          {comp.actual_weight && (
                            <Badge variant="secondary" className="text-xs">
                              {comp.actual_weight}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Assign Routine Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar rutinas a {student.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {availableRoutines.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Todas tus rutinas ya estan asignadas a este alumno
              </p>
            ) : (
              availableRoutines.map((routine) => (
                <div
                  key={routine.id}
                  className="flex items-start gap-3 p-3 border border-border/50 rounded-xl"
                >
                  <Checkbox
                    id={`routine-${routine.id}`}
                    checked={selectedRoutines.includes(routine.id)}
                    onCheckedChange={() =>
                      setSelectedRoutines((prev) =>
                        prev.includes(routine.id)
                          ? prev.filter((id) => id !== routine.id)
                          : [...prev, routine.id]
                      )
                    }
                  />
                  <label htmlFor={`routine-${routine.id}`} className="flex-1 cursor-pointer">
                    <p className="font-medium">{routine.name}</p>
                    {routine.description && (
                      <p className="text-sm text-muted-foreground">{routine.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {getDurationLabel(routine.duration_type)}
                    </p>
                  </label>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setAssignDialogOpen(false);
                setSelectedRoutines([]);
              }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAssignRoutines}
              disabled={selectedRoutines.length === 0 || assigning}
              className="flex-1"
            >
              {assigning
                ? "Asignando..."
                : `Asignar (${selectedRoutines.length})`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
