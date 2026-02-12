"use client";

import React from "react"

import { useState } from "react";
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
import { ChevronLeft, Plus, Trash2, Loader2, GripVertical } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type { Profile, TrainerStudent } from "@/lib/types";

interface StudentWithProfile extends TrainerStudent {
  student: Profile;
}

interface CreateRoutineFormProps {
  trainerId: string;
  students: StudentWithProfile[];
}

interface ExerciseInput {
  id: string;
  name: string;
  sets: string;
  reps: string;
  weight: string;
  video_url: string;
  notes: string;
}

interface DayInput {
  id: string;
  day_number: number;
  week_number: number;
  name: string;
  exercises: ExerciseInput[];
}

export function CreateRoutineForm({ trainerId, students }: CreateRoutineFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

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
      sets: "",
      reps: "",
      weight: "",
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

  const updateExercise = (exerciseId: string, field: keyof ExerciseInput, value: string) => {
    setDays(
      days.map((d) => ({
        ...d,
        exercises: d.exercises.map((e) =>
          e.id === exerciseId ? { ...e, [field]: value } : e
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !startDate) {
      toast.error("Completa el nombre y fecha de inicio");
      return;
    }

    setLoading(true);

    try {
      // Create routine
      const { data: routine, error: routineError } = await supabase
        .from("routines")
        .insert({
          trainer_id: trainerId,
          name,
          description: description || null,
          duration_type: durationType,
          start_date: startDate,
          end_date: calculateEndDate(),
        })
        .select()
        .single();

      if (routineError) throw routineError;

      // Create workout days and exercises
      for (const day of days) {
        if (day.exercises.length === 0) continue;

        const { data: workoutDay, error: dayError } = await supabase
          .from("workout_days")
          .insert({
            routine_id: routine.id,
            day_number: day.day_number,
            week_number: day.week_number,
            name: day.name || null,
          })
          .select()
          .single();

        if (dayError) throw dayError;

        // Create exercises
        const exercisesToInsert = day.exercises
          .filter((e) => e.name.trim())
          .map((e, index) => ({
            workout_day_id: workoutDay.id,
            name: e.name,
            sets: e.sets ? parseInt(e.sets) : null,
            reps: e.reps || null,
            weight: e.weight || null,
            video_url: e.video_url || null,
            notes: e.notes || null,
            order_index: index,
          }));

        if (exercisesToInsert.length > 0) {
          const { error: exercisesError } = await supabase
            .from("exercises")
            .insert(exercisesToInsert);

          if (exercisesError) throw exercisesError;
        }
      }

      // Assign to students
      if (selectedStudents.length > 0) {
        const assignments = selectedStudents.map((studentId) => ({
          routine_id: routine.id,
          student_id: studentId,
        }));

        const { error: assignmentError } = await supabase
          .from("routine_assignments")
          .insert(assignments);

        if (assignmentError) throw assignmentError;
      }

      toast.success("Rutina creada exitosamente");
      router.push(`/dashboard/routines/${routine.id}`);
    } catch (error) {
      console.error(error);
      toast.error("Error al crear la rutina");
    }

    setLoading(false);
  };

  const dayNames = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
  const currentDayData = getCurrentDayData();
  const totalWeeks = getTotalWeeks();

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/routines">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="font-bold text-lg">Nueva rutina</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        {/* Basic info */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Informacion basica</CardTitle>
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
              <Label htmlFor="description">Descripcion (opcional)</Label>
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
                <Label>Duracion</Label>
                <Select
                  value={durationType}
                  onValueChange={(v) => setDurationType(v as "week" | "month" | "trimester")}
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

        {/* Week/Day selector */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ejercicios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Week selector */}
            {totalWeeks > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((week) => (
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
                ))}
              </div>
            )}

            {/* Day selector */}
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
                    <span className="text-xs font-medium block">{dayNames[index]}</span>
                  </button>
                );
              })}
            </div>

            {/* Day name */}
            {currentDayData && (
              <Input
                placeholder="Nombre del dia (ej: Pecho y triceps)"
                value={currentDayData.name}
                onChange={(e) => updateDayName(currentDayData.id, e.target.value)}
                className="bg-background/50"
              />
            )}

            {/* Exercises list */}
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
                      onChange={(e) => updateExercise(exercise.id, "name", e.target.value)}
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
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      placeholder="Series"
                      value={exercise.sets}
                      onChange={(e) => updateExercise(exercise.id, "sets", e.target.value)}
                      className="bg-background/50"
                    />
                    <Input
                      placeholder="Reps"
                      value={exercise.reps}
                      onChange={(e) => updateExercise(exercise.id, "reps", e.target.value)}
                      className="bg-background/50"
                    />
                    <Input
                      placeholder="Peso"
                      value={exercise.weight}
                      onChange={(e) => updateExercise(exercise.id, "weight", e.target.value)}
                      className="bg-background/50"
                    />
                  </div>
                  <Input
                    placeholder="URL del video (opcional)"
                    value={exercise.video_url}
                    onChange={(e) => updateExercise(exercise.id, "video_url", e.target.value)}
                    className="bg-background/50"
                  />
                  <Textarea
                    placeholder="Notas (opcional)"
                    value={exercise.notes}
                    onChange={(e) => updateExercise(exercise.id, "notes", e.target.value)}
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

        {/* Assign to students */}
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

        {/* Submit */}
        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creando rutina...
            </>
          ) : (
            "Crear rutina"
          )}
        </Button>
      </form>
    </div>
  );
}
