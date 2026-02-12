"use client";

import React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, Plus, Trash2, Loader2, GripVertical, Minus } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type { Profile, TrainerStudent, Routine, WorkoutDay, Exercise } from "@/lib/types";

interface StudentWithProfile extends TrainerStudent {
  student: Profile;
}

interface EditRoutineFormProps {
  routineId: string;
  trainerId: string;
  students: StudentWithProfile[];
}

interface SetConfigInput {
  id: string;
  sets: string;
  reps: string;
  weight: string;
}

interface ExerciseInput {
  id: string;
  name: string;
  set_configurations: SetConfigInput[];
  video_url: string;
  notes: string;
}

interface DayInput {
  id: string;
  workoutDayId?: string; // DB id for existing workout days
  day_number: number;
  week_number: number;
  name: string;
  exercises: ExerciseInput[];
}

function isUuid(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

export function EditRoutineForm({
  routineId,
  trainerId,
  students,
}: EditRoutineFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [durationType, setDurationType] = useState<"week" | "month" | "trimester">("week");
  const [startDate, setStartDate] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [days, setDays] = useState<DayInput[]>([]);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [currentDay, setCurrentDay] = useState(1);

  const getTotalWeeks = () => {
    switch (durationType) {
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

  const calculateEndDate = () => {
    if (!startDate) return "";
    const start = new Date(startDate);
    const weeks = getTotalWeeks();
    const end = new Date(start);
    end.setDate(end.getDate() + weeks * 7 - 1);
    return end.toISOString().split("T")[0];
  };

  const getCurrentDayData = () => {
    return days.find(
      (d) => d.week_number === currentWeek && d.day_number === currentDay
    );
  };

  const addExerciseToDay = () => {
    const existingDay = getCurrentDayData();
    const newExercise: ExerciseInput = {
      id: crypto.randomUUID(),
      name: "",
      set_configurations: [
        { id: crypto.randomUUID(), sets: "", reps: "", weight: "" },
      ],
      video_url: "",
      notes: "",
    };

    if (existingDay) {
      setDays(
        days.map((d) =>
          d.id === existingDay.id
            ? { ...d, exercises: [...d.exercises, newExercise] }
            : d
        )
      );
    } else {
      const newDay: DayInput = {
        id: crypto.randomUUID(),
        day_number: currentDay,
        week_number: currentWeek,
        name: "",
        exercises: [newExercise],
      };
      setDays([...days, newDay]);
    }
  };

  const updateExercise = (
    exerciseId: string,
    field: keyof ExerciseInput,
    value: string
  ) => {
    setDays(
      days.map((d) => ({
        ...d,
        exercises: d.exercises.map((e) =>
          e.id === exerciseId ? { ...e, [field]: value } : e
        ),
      }))
    );
  };

  const updateSetConfig = (
    exerciseId: string,
    configId: string,
    field: keyof SetConfigInput,
    value: string
  ) => {
    setDays(
      days.map((d) => ({
        ...d,
        exercises: d.exercises.map((e) =>
          e.id === exerciseId
            ? {
                ...e,
                set_configurations: e.set_configurations.map((c) =>
                  c.id === configId ? { ...c, [field]: value } : c
                ),
              }
            : e
        ),
      }))
    );
  };

  const addSetConfig = (exerciseId: string) => {
    setDays(
      days.map((d) => ({
        ...d,
        exercises: d.exercises.map((e) =>
          e.id === exerciseId
            ? {
                ...e,
                set_configurations: [
                  ...e.set_configurations,
                  {
                    id: crypto.randomUUID(),
                    sets: "",
                    reps: "",
                    weight: "",
                  },
                ],
              }
            : e
        ),
      }))
    );
  };

  const removeSetConfig = (exerciseId: string, configId: string) => {
    setDays(
      days.map((d) => ({
        ...d,
        exercises: d.exercises.map((e) =>
          e.id === exerciseId
            ? {
                ...e,
                set_configurations: e.set_configurations.filter(
                  (c) => c.id !== configId
                ),
              }
            : e
        ),
      }))
    );
  };

  const removeExercise = (exerciseId: string) => {
    setDays(
      days.map((d) => ({
        ...d,
        exercises: d.exercises.filter((e) => e.id !== exerciseId),
      }))
    );
  };

  const updateDayName = (dayId: string, name: string) => {
    setDays(days.map((d) => (d.id === dayId ? { ...d, name } : d)));
  };

  const toggleStudent = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  // Load routine data
  useEffect(() => {
    async function loadRoutine() {
      const { data: routine, error: routineError } = await supabase
        .from("routines")
        .select(`
          *,
          workout_days(
            *,
            exercises(*)
          )
        `)
        .eq("id", routineId)
        .eq("trainer_id", trainerId)
        .single();

      if (routineError || !routine) {
        toast.error("No se pudo cargar la rutina");
        router.push("/dashboard/routines");
        return;
      }

      // Load assigned students
      const { data: assignments } = await supabase
        .from("routine_assignments")
        .select("student_id")
        .eq("routine_id", routineId);

      setName(routine.name);
      setDescription(routine.description || "");
      setDurationType(
        (routine.duration_type as "week" | "month" | "trimester") || "week"
      );
      setStartDate(routine.start_date?.split("T")[0] || "");
      setSelectedStudents(
        assignments?.map((a) => a.student_id) || []
      );

      // Map workout_days to DayInput - handle both day_number and day_of_week
      const workoutDays = routine.workout_days as (WorkoutDay & {
        exercises: Exercise[];
      })[];
      const dayInputs: DayInput[] = workoutDays.map((wd) => ({
        id: wd.id,
        workoutDayId: wd.id,
        day_number: (wd as WorkoutDay & { day_number?: number }).day_number ?? (wd as WorkoutDay & { day_of_week?: number }).day_of_week ?? 1,
        week_number: wd.week_number,
        name: wd.name || "",
        exercises: (wd.exercises || [])
          .sort((a, b) => a.order_index - b.order_index)
          .map((e) => {
            const ex = e as Exercise & { set_configurations?: { sets: number | null; reps: string | null; weight: string | null }[] };
            const configs = ex.set_configurations?.length
              ? ex.set_configurations.map((c, i) => ({
                  id: `${e.id}-config-${i}`,
                  sets: c.sets?.toString() ?? "",
                  reps: c.reps ?? "",
                  weight: c.weight ?? "",
                }))
              : [
                  {
                    id: `${e.id}-config-0`,
                    sets: e.sets?.toString() ?? "",
                    reps: e.reps ?? "",
                    weight: e.weight ?? "",
                  },
                ];
            return {
              id: e.id,
              name: e.name,
              set_configurations: configs,
              video_url: e.video_url ?? "",
              notes: e.notes ?? "",
            };
          }),
      }));

      setDays(dayInputs);
      setLoading(false);
    }

    loadRoutine();
  }, [routineId, trainerId, router, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !startDate) {
      toast.error("Completa el nombre y fecha de inicio");
      return;
    }

    setSaving(true);

    try {
      // Update routine
      const { error: routineError } = await supabase
        .from("routines")
        .update({
          name,
          description: description || null,
          duration_type: durationType,
          start_date: startDate,
          end_date: calculateEndDate(),
        })
        .eq("id", routineId);

      if (routineError) throw routineError;

      // Get existing workout day IDs to track deletions
      const existingWorkoutDayIds = days
        .filter((d) => d.workoutDayId)
        .map((d) => d.workoutDayId!);

      const { data: allWorkoutDays } = await supabase
        .from("workout_days")
        .select("id")
        .eq("routine_id", routineId);

      const toDeleteWorkoutDays = (allWorkoutDays || []).filter(
        (wd) => !existingWorkoutDayIds.includes(wd.id)
      );

      for (const wd of toDeleteWorkoutDays) {
        await supabase.from("workout_days").delete().eq("id", wd.id);
      }

      // Update or create workout days and exercises
      for (const day of days) {
        if (day.exercises.length === 0 && !day.workoutDayId) continue;

        const exercisesToSync = day.exercises
          .filter((e) => e.name.trim())
          .map((e, index) => {
            const setConfigs = e.set_configurations
              .filter((c) => c.sets || c.reps || c.weight)
              .map((c) => ({
                sets: c.sets ? parseInt(c.sets) : null,
                reps: c.reps || null,
                weight: c.weight || null,
              }));
            return {
              id: isUuid(e.id) ? e.id : null,
              name: e.name,
              set_configurations: setConfigs.length > 0 ? setConfigs : [{ sets: null, reps: null, weight: null }],
              video_url: e.video_url || null,
              notes: e.notes || null,
              order_index: index,
            };
          });

        if (day.workoutDayId) {
          // Update existing workout day
          await supabase
            .from("workout_days")
            .update({
              day_number: day.day_number,
              week_number: day.week_number,
              name: day.name || null,
            })
            .eq("id", day.workoutDayId);

          // Get existing exercise IDs for this day
          const { data: existingExercises } = await supabase
            .from("exercises")
            .select("id")
            .eq("workout_day_id", day.workoutDayId);

          const syncedIds = exercisesToSync
            .filter((e) => e.id)
            .map((e) => e.id!);
          const toDelete = (existingExercises || []).filter(
            (ex) => !syncedIds.includes(ex.id)
          );

          for (const ex of toDelete) {
            await supabase.from("exercises").delete().eq("id", ex.id);
          }

          for (const ex of exercisesToSync) {
            const first = ex.set_configurations[0];
            const payload = {
              name: ex.name,
              sets: first?.sets ?? 3,
              reps: first?.reps ?? "10",
              weight: first?.weight ?? null,
              set_configurations: ex.set_configurations,
              video_url: ex.video_url,
              notes: ex.notes,
              order_index: ex.order_index,
            };
            if (ex.id) {
              await supabase
                .from("exercises")
                .update(payload)
                .eq("id", ex.id);
            } else {
              await supabase.from("exercises").insert({
                workout_day_id: day.workoutDayId,
                ...payload,
              });
            }
          }
        } else {
          // Create new workout day
          if (exercisesToSync.length === 0) continue;

          const { data: workoutDay, error: dayError } = await supabase
            .from("workout_days")
            .insert({
              routine_id: routineId,
              day_number: day.day_number,
              week_number: day.week_number,
              name: day.name || null,
            })
            .select()
            .single();

          if (dayError) throw dayError;

          if (workoutDay && exercisesToSync.length > 0) {
            const exercisesToInsert = exercisesToSync.map((e, index) => {
              const first = e.set_configurations[0];
              return {
                workout_day_id: workoutDay.id,
                name: e.name,
                sets: first?.sets ?? 3,
                reps: first?.reps ?? "10",
                weight: first?.weight ?? null,
                set_configurations: e.set_configurations,
                video_url: e.video_url,
                notes: e.notes,
                order_index: index,
              };
            });

            const { error: exError } = await supabase
              .from("exercises")
              .insert(exercisesToInsert);

            if (exError) throw exError;
          }
        }
      }

      // Sync routine assignments
      const { data: currentAssignments } = await supabase
        .from("routine_assignments")
        .select("student_id")
        .eq("routine_id", routineId);

      const currentIds = new Set(
        (currentAssignments || []).map((a) => a.student_id)
      );
      const selectedSet = new Set(selectedStudents);

      for (const studentId of selectedSet) {
        if (!currentIds.has(studentId)) {
          await supabase.from("routine_assignments").insert({
            routine_id: routineId,
            student_id: studentId,
          });
        }
      }

      for (const studentId of currentIds) {
        if (!selectedSet.has(studentId)) {
          await supabase
            .from("routine_assignments")
            .delete()
            .eq("routine_id", routineId)
            .eq("student_id", studentId);
        }
      }

      toast.success("Rutina actualizada exitosamente");
      router.push(`/dashboard/routines/${routineId}`);
    } catch (error) {
      console.error(error);
      toast.error("Error al actualizar la rutina");
    }

    setSaving(false);
  };

  const dayNames = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
  const currentDayData = getCurrentDayData();
  const totalWeeks = getTotalWeeks();

  if (loading) {
    return (
      <div className="min-h-screen pb-24 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/routines/${routineId}`}>
            <Button variant="ghost" size="icon">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="font-bold text-lg">Editar rutina</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Información básica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre de la rutina</Label>
              <Input
                id="name"
                placeholder="Ej: Fuerza - Principiantes"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Textarea
                id="description"
                placeholder="Describe el objetivo de esta rutina..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="bg-background/50"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duración</Label>
                <Select
                  value={durationType}
                  onValueChange={(v) =>
                    setDurationType(v as "week" | "month" | "trimester")
                  }
                >
                  <SelectTrigger className="bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">1 Semana</SelectItem>
                    <SelectItem value="month">1 Mes</SelectItem>
                    <SelectItem value="trimester">3 Meses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Fecha inicio</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="bg-background/50"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ejercicios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {totalWeeks > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {Array.from({ length: totalWeeks }, (_, i) => i + 1).map(
                  (week) => (
                    <button
                      key={week}
                      type="button"
                      onClick={() => setCurrentWeek(week)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                        currentWeek === week
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80"
                      }`}
                    >
                      Semana {week}
                    </button>
                  )
                )}
              </div>
            )}

            <div className="flex gap-1">
              {[1, 2, 3, 4, 5, 6, 7].map((day, index) => {
                const hasExercises = days.some(
                  (d) =>
                    d.week_number === currentWeek &&
                    d.day_number === day &&
                    d.exercises.length > 0
                );
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setCurrentDay(day)}
                    className={`flex-1 py-2 rounded-xl text-center transition-all ${
                      currentDay === day
                        ? "bg-primary text-primary-foreground"
                        : hasExercises
                        ? "bg-primary/20 text-primary"
                        : "bg-muted"
                    }`}
                  >
                    <span className="text-xs font-medium block">
                      {dayNames[index]}
                    </span>
                  </button>
                );
              })}
            </div>

            {currentDayData && (
              <Input
                placeholder="Nombre del día (ej: Pecho y tríceps)"
                value={currentDayData.name}
                onChange={(e) =>
                  updateDayName(currentDayData.id, e.target.value)
                }
                className="bg-background/50"
              />
            )}

            <div className="space-y-3">
              {currentDayData?.exercises.map((exercise, index) => (
                <div
                  key={exercise.id}
                  className="bg-muted/50 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">
                      #{index + 1}
                    </span>
                    <Input
                      placeholder="Nombre del ejercicio"
                      value={exercise.name}
                      onChange={(e) =>
                        updateExercise(exercise.id, "name", e.target.value)
                      }
                      className="flex-1 bg-background/50"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeExercise(exercise.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {exercise.set_configurations.map((config, configIndex) => (
                      <div key={config.id} className="flex items-center gap-2">
                        <div className="grid grid-cols-3 gap-2 flex-1">
                          <Input
                            placeholder="Series"
                            value={config.sets}
                            onChange={(e) =>
                              updateSetConfig(
                                exercise.id,
                                config.id,
                                "sets",
                                e.target.value
                              )
                            }
                            className="bg-background/50"
                          />
                          <Input
                            placeholder="Reps"
                            value={config.reps}
                            onChange={(e) =>
                              updateSetConfig(
                                exercise.id,
                                config.id,
                                "reps",
                                e.target.value
                              )
                            }
                            className="bg-background/50"
                          />
                          <Input
                            placeholder="Peso"
                            value={config.weight}
                            onChange={(e) =>
                              updateSetConfig(
                                exercise.id,
                                config.id,
                                "weight",
                                e.target.value
                              )
                            }
                            className="bg-background/50"
                          />
                        </div>
                        {exercise.set_configurations.length > 1 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              removeSetConfig(exercise.id, config.id)
                            }
                            className="shrink-0 text-muted-foreground hover:text-destructive"
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                        ) : (
                          <div className="w-10 shrink-0" />
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addSetConfig(exercise.id)}
                      className="w-full bg-transparent"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar series/reps/peso
                    </Button>
                  </div>
                  <Input
                    placeholder="URL del video (opcional)"
                    value={exercise.video_url}
                    onChange={(e) =>
                      updateExercise(exercise.id, "video_url", e.target.value)
                    }
                    className="bg-background/50"
                  />
                  <Textarea
                    placeholder="Notas (opcional)"
                    value={exercise.notes}
                    onChange={(e) =>
                      updateExercise(exercise.id, "notes", e.target.value)
                    }
                    rows={2}
                    className="bg-background/50"
                  />
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full bg-transparent"
              onClick={addExerciseToDay}
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar ejercicio
            </Button>
          </CardContent>
        </Card>

        {students.length > 0 && (
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Asignar a alumnos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {students.map((s) => (
                <div key={s.id} className="flex items-center gap-3">
                  <Checkbox
                    id={s.student.id}
                    checked={selectedStudents.includes(s.student.id)}
                    onCheckedChange={() => toggleStudent(s.student.id)}
                  />
                  <label
                    htmlFor={s.student.id}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {s.student.full_name}
                  </label>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            "Guardar cambios"
          )}
        </Button>
      </form>
    </div>
  );
}
