"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  User,
  Target,
  Ruler,
  Heart,
  StickyNote,
  Scale,
  Pencil,
} from "lucide-react";
import type { Profile, TrainerNote, BodyMetric } from "@/lib/types";
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
  const [completionsByExercise, setCompletionsByExercise] = useState<Record<string, ExerciseCompletionData>>({});

  // Student profile editing
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    objective: student.objective || "",
    birth_date: student.birth_date || "",
    gender: student.gender || "",
    height_cm: student.height_cm?.toString() || "",
    weight_kg: student.weight_kg?.toString() || "",
    experience_level: student.experience_level || "",
    injuries: student.injuries || "",
    medical_notes: student.medical_notes || "",
    desired_frequency: student.desired_frequency?.toString() || "",
    notes: student.notes || "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Trainer notes
  const [trainerNotes, setTrainerNotes] = useState<TrainerNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Body metrics
  const [bodyMetrics, setBodyMetrics] = useState<BodyMetric[]>([]);
  const [metricsDialogOpen, setMetricsDialogOpen] = useState(false);
  const [metricsForm, setMetricsForm] = useState({
    weight_kg: "",
    body_fat_pct: "",
    chest_cm: "",
    waist_cm: "",
    hips_cm: "",
    arm_cm: "",
    thigh_cm: "",
    notes: "",
  });
  const [savingMetrics, setSavingMetrics] = useState(false);

  // Fetch comments
  useEffect(() => {
    async function fetchComments() {
      const [weekRes, dayRes, exerciseRes] = await Promise.all([
        supabase
          .from("comments")
          .select("*, routine:routines(name)")
          .eq("student_id", student.id)
          .eq("comment_type", "week")
          .order("created_at", { ascending: false }),
        supabase
          .from("comments")
          .select("*, workout_day:workout_days(name, day_number, routine:routines(name))")
          .eq("student_id", student.id)
          .eq("comment_type", "day")
          .order("created_at", { ascending: false }),
        supabase
          .from("comments")
          .select("*, exercise:exercises(name, workout_day:workout_days(routine:routines(name)))")
          .eq("student_id", student.id)
          .eq("comment_type", "exercise")
          .order("created_at", { ascending: false }),
      ]);

      const allComments: StudentComment[] = [];

      (weekRes.data || []).forEach((c: any) => {
        allComments.push({
          id: c.id, comment_type: "week", content: c.content, created_at: c.created_at,
          routine_id: c.routine_id, week_number: c.week_number,
          workout_day_id: null, exercise_id: null, routine_name: c.routine?.name,
        });
      });

      (dayRes.data || []).forEach((c: any) => {
        allComments.push({
          id: c.id, comment_type: "day", content: c.content, created_at: c.created_at,
          routine_id: null, week_number: null, workout_day_id: c.workout_day_id, exercise_id: null,
          routine_name: c.workout_day?.routine?.name, day_name: c.workout_day?.name, day_number: c.workout_day?.day_number,
        });
      });

      (exerciseRes.data || []).forEach((c: any) => {
        allComments.push({
          id: c.id, comment_type: "exercise", content: c.content, created_at: c.created_at,
          routine_id: null, week_number: null, workout_day_id: null, exercise_id: c.exercise_id,
          exercise_name: c.exercise?.name, routine_name: c.exercise?.workout_day?.routine?.name,
        });
      });

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
            id: c.id, exercise_id: c.exercise_id, completed_at: c.completed_at,
            actual_sets: c.actual_sets, actual_reps: c.actual_reps, actual_weight: c.actual_weight,
            exercise_name: c.exercise?.name || "Ejercicio",
            routine_name: c.exercise?.workout_day?.routine?.name || "",
          };
          byExercise[c.exercise_id] = item;
          if (c.actual_sets || c.actual_reps || c.actual_weight) {
            mapped.push(item);
          }
        });

        setCompletionsWithData(mapped);
        setCompletionsByExercise(byExercise);
      }
    }

    async function fetchTrainerNotes() {
      const { data } = await supabase
        .from("trainer_notes")
        .select("*, routine:routines(name)")
        .eq("student_id", student.id)
        .order("created_at", { ascending: false });

      if (data) setTrainerNotes(data as any);
    }

    async function fetchBodyMetrics() {
      const { data } = await supabase
        .from("body_metrics")
        .select("*")
        .eq("student_id", student.id)
        .order("recorded_at", { ascending: false })
        .limit(20);

      if (data) setBodyMetrics(data as BodyMetric[]);
    }

    fetchComments();
    fetchCompletions();
    fetchTrainerNotes();
    fetchBodyMetrics();
  }, [student.id, supabase]);

  // Profile save handler
  const handleSaveProfile = async () => {
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        objective: profileForm.objective || null,
        birth_date: profileForm.birth_date || null,
        gender: profileForm.gender || null,
        height_cm: profileForm.height_cm ? parseFloat(profileForm.height_cm) : null,
        weight_kg: profileForm.weight_kg ? parseFloat(profileForm.weight_kg) : null,
        experience_level: profileForm.experience_level || null,
        injuries: profileForm.injuries || null,
        medical_notes: profileForm.medical_notes || null,
        desired_frequency: profileForm.desired_frequency ? parseInt(profileForm.desired_frequency) : null,
        notes: profileForm.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", student.id);

    if (error) {
      toast.error("Error al guardar perfil");
    } else {
      toast.success("Perfil actualizado");
      setEditProfileOpen(false);
    }
    setSavingProfile(false);
  };

  // Trainer note handler
  const handleSaveNote = async () => {
    if (!newNote.trim()) return;
    setSavingNote(true);

    const { data, error } = await supabase
      .from("trainer_notes")
      .insert({
        trainer_id: (await supabase.auth.getUser()).data.user?.id,
        student_id: student.id,
        content: newNote.trim(),
      })
      .select("*, routine:routines(name)")
      .single();

    if (error) {
      toast.error("Error al guardar nota");
    } else {
      setTrainerNotes((prev) => [data as any, ...prev]);
      setNewNote("");
      toast.success("Nota guardada");
    }
    setSavingNote(false);
  };

  const handleDeleteNote = async (noteId: string) => {
    const { error } = await supabase.from("trainer_notes").delete().eq("id", noteId);
    if (error) {
      toast.error("Error al eliminar nota");
    } else {
      setTrainerNotes((prev) => prev.filter((n) => n.id !== noteId));
      toast.success("Nota eliminada");
    }
  };

  // Body metrics handler
  const handleSaveMetrics = async () => {
    setSavingMetrics(true);

    const insertData: Record<string, any> = {
      student_id: student.id,
    };
    if (metricsForm.weight_kg) insertData.weight_kg = parseFloat(metricsForm.weight_kg);
    if (metricsForm.body_fat_pct) insertData.body_fat_pct = parseFloat(metricsForm.body_fat_pct);
    if (metricsForm.chest_cm) insertData.chest_cm = parseFloat(metricsForm.chest_cm);
    if (metricsForm.waist_cm) insertData.waist_cm = parseFloat(metricsForm.waist_cm);
    if (metricsForm.hips_cm) insertData.hips_cm = parseFloat(metricsForm.hips_cm);
    if (metricsForm.arm_cm) insertData.arm_cm = parseFloat(metricsForm.arm_cm);
    if (metricsForm.thigh_cm) insertData.thigh_cm = parseFloat(metricsForm.thigh_cm);
    if (metricsForm.notes) insertData.notes = metricsForm.notes;

    const { data, error } = await supabase
      .from("body_metrics")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      toast.error("Error al guardar metricas");
    } else {
      setBodyMetrics((prev) => [data as BodyMetric, ...prev]);
      setMetricsForm({ weight_kg: "", body_fat_pct: "", chest_cm: "", waist_cm: "", hips_cm: "", arm_cm: "", thigh_cm: "", notes: "" });
      setMetricsDialogOpen(false);
      toast.success("Metricas registradas");
    }
    setSavingMetrics(false);
  };

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

  const getExperienceLabel = (level: string | null) => {
    switch (level) {
      case "beginner": return "Principiante";
      case "intermediate": return "Intermedio";
      case "advanced": return "Avanzado";
      default: return null;
    }
  };

  const getGenderLabel = (g: string | null) => {
    switch (g) {
      case "male": return "Masculino";
      case "female": return "Femenino";
      case "other": return "Otro";
      default: return null;
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
        id, routine_id, student_id, assigned_at, visible,
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

  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
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
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl shrink-0">
                {student.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold truncate">{student.full_name}</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditProfileOpen(true)}
                    title="Editar perfil"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{student.email}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>Miembro desde {new Date(student.created_at).toLocaleDateString("es")}</span>
                </div>

                {/* Context data badges */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {student.objective && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Target className="w-3 h-3" />
                      {student.objective}
                    </Badge>
                  )}
                  {student.experience_level && (
                    <Badge variant="secondary" className="text-xs">
                      {getExperienceLabel(student.experience_level)}
                    </Badge>
                  )}
                  {student.birth_date && (
                    <Badge variant="secondary" className="text-xs">
                      {calculateAge(student.birth_date)} anios
                    </Badge>
                  )}
                  {student.gender && (
                    <Badge variant="secondary" className="text-xs">
                      {getGenderLabel(student.gender)}
                    </Badge>
                  )}
                  {student.height_cm && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Ruler className="w-3 h-3" />
                      {student.height_cm} cm
                    </Badge>
                  )}
                  {student.weight_kg && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Scale className="w-3 h-3" />
                      {student.weight_kg} kg
                    </Badge>
                  )}
                  {student.desired_frequency && (
                    <Badge variant="secondary" className="text-xs">
                      {student.desired_frequency}x/sem
                    </Badge>
                  )}
                </div>

                {/* Injuries / medical notes */}
                {(student.injuries || student.medical_notes) && (
                  <div className="mt-3 space-y-1">
                    {student.injuries && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        Lesiones: {student.injuries}
                      </p>
                    )}
                    {student.medical_notes && (
                      <p className="text-xs text-muted-foreground">
                        Notas medicas: {student.medical_notes}
                      </p>
                    )}
                  </div>
                )}

                {student.notes && (
                  <p className="text-xs text-muted-foreground mt-2">{student.notes}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Body Metrics Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              <Scale className="w-5 h-5 inline-block mr-2" />
              Metricas corporales
            </h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setMetricsDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Registrar
            </Button>
          </div>

          {bodyMetrics.length === 0 ? (
            <Card className="border-dashed border-2 border-border/50">
              <CardContent className="p-6 text-center">
                <Scale className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Sin metricas registradas
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {bodyMetrics.map((metric) => (
                <Card key={metric.id} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(metric.recorded_at).toLocaleDateString("es", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {metric.weight_kg && (
                        <Badge variant="secondary" className="text-xs">Peso: {metric.weight_kg} kg</Badge>
                      )}
                      {metric.body_fat_pct && (
                        <Badge variant="secondary" className="text-xs">Grasa: {metric.body_fat_pct}%</Badge>
                      )}
                      {metric.chest_cm && (
                        <Badge variant="outline" className="text-xs">Pecho: {metric.chest_cm} cm</Badge>
                      )}
                      {metric.waist_cm && (
                        <Badge variant="outline" className="text-xs">Cintura: {metric.waist_cm} cm</Badge>
                      )}
                      {metric.hips_cm && (
                        <Badge variant="outline" className="text-xs">Cadera: {metric.hips_cm} cm</Badge>
                      )}
                      {metric.arm_cm && (
                        <Badge variant="outline" className="text-xs">Brazo: {metric.arm_cm} cm</Badge>
                      )}
                      {metric.thigh_cm && (
                        <Badge variant="outline" className="text-xs">Muslo: {metric.thigh_cm} cm</Badge>
                      )}
                    </div>
                    {metric.notes && (
                      <p className="text-xs text-muted-foreground mt-2">{metric.notes}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

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
                          onClick={() => toggleVisibility(assignment.id, assignment.visible)}
                          title={assignment.visible ? "Ocultar al alumno" : "Mostrar al alumno"}
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
                          onClick={() => handleUnassign(assignment.id, assignment.routine.name)}
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

        {/* Trainer Notes Section */}
        <div>
          <h2 className="text-lg font-semibold mb-4">
            <StickyNote className="w-5 h-5 inline-block mr-2" />
            Notas del entrenador
          </h2>

          <div className="space-y-3">
            <Card className="border-border/50">
              <CardContent className="p-4 space-y-3">
                <Textarea
                  placeholder="Escribir observacion sobre el alumno..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={2}
                  className="bg-background/50"
                />
                <Button
                  size="sm"
                  onClick={handleSaveNote}
                  disabled={savingNote || !newNote.trim()}
                >
                  {savingNote ? "Guardando..." : "Guardar nota"}
                </Button>
              </CardContent>
            </Card>

            {trainerNotes.map((note) => (
              <Card key={note.id} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                      <StickyNote className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-muted-foreground">
                        {new Date(note.created_at).toLocaleDateString("es", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <p className="text-sm mt-1">{note.content}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0 p-0.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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

      {/* Edit Profile Dialog */}
      <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Perfil de {student.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Objetivo de entrenamiento</Label>
              <Textarea
                placeholder="Ej: Ganar masa muscular, bajar de peso, mejorar resistencia..."
                value={profileForm.objective}
                onChange={(e) => setProfileForm({ ...profileForm, objective: e.target.value })}
                rows={2}
                className="bg-background/50"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Fecha de nacimiento</Label>
                <Input
                  type="date"
                  value={profileForm.birth_date}
                  onChange={(e) => setProfileForm({ ...profileForm, birth_date: e.target.value })}
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label>Genero</Label>
                <Select
                  value={profileForm.gender}
                  onValueChange={(v) => setProfileForm({ ...profileForm, gender: v })}
                >
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Masculino</SelectItem>
                    <SelectItem value="female">Femenino</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Altura (cm)</Label>
                <Input
                  type="number"
                  placeholder="175"
                  value={profileForm.height_cm}
                  onChange={(e) => setProfileForm({ ...profileForm, height_cm: e.target.value })}
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label>Peso (kg)</Label>
                <Input
                  type="number"
                  placeholder="75"
                  value={profileForm.weight_kg}
                  onChange={(e) => setProfileForm({ ...profileForm, weight_kg: e.target.value })}
                  className="bg-background/50"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Nivel de experiencia</Label>
                <Select
                  value={profileForm.experience_level}
                  onValueChange={(v) => setProfileForm({ ...profileForm, experience_level: v })}
                >
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Principiante</SelectItem>
                    <SelectItem value="intermediate">Intermedio</SelectItem>
                    <SelectItem value="advanced">Avanzado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Frecuencia deseada</Label>
                <Input
                  type="number"
                  placeholder="3"
                  min="1"
                  max="7"
                  value={profileForm.desired_frequency}
                  onChange={(e) => setProfileForm({ ...profileForm, desired_frequency: e.target.value })}
                  className="bg-background/50"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Lesiones / limitaciones</Label>
              <Textarea
                placeholder="Ej: Dolor lumbar cronico, rodilla derecha operada..."
                value={profileForm.injuries}
                onChange={(e) => setProfileForm({ ...profileForm, injuries: e.target.value })}
                rows={2}
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Notas medicas</Label>
              <Textarea
                placeholder="Ej: Hipertenso controlado, medicacion..."
                value={profileForm.medical_notes}
                onChange={(e) => setProfileForm({ ...profileForm, medical_notes: e.target.value })}
                rows={2}
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Notas generales</Label>
              <Textarea
                placeholder="Cualquier informacion adicional..."
                value={profileForm.notes}
                onChange={(e) => setProfileForm({ ...profileForm, notes: e.target.value })}
                rows={2}
                className="bg-background/50"
              />
            </div>
            <Button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="w-full"
            >
              {savingProfile ? "Guardando..." : "Guardar perfil"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Body Metrics Dialog */}
      <Dialog open={metricsDialogOpen} onOpenChange={setMetricsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar metricas corporales</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Peso (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="75.5"
                  value={metricsForm.weight_kg}
                  onChange={(e) => setMetricsForm({ ...metricsForm, weight_kg: e.target.value })}
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">% Grasa corporal</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="18.5"
                  value={metricsForm.body_fat_pct}
                  onChange={(e) => setMetricsForm({ ...metricsForm, body_fat_pct: e.target.value })}
                  className="bg-background/50"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Pecho (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={metricsForm.chest_cm}
                  onChange={(e) => setMetricsForm({ ...metricsForm, chest_cm: e.target.value })}
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Cintura (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={metricsForm.waist_cm}
                  onChange={(e) => setMetricsForm({ ...metricsForm, waist_cm: e.target.value })}
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Cadera (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={metricsForm.hips_cm}
                  onChange={(e) => setMetricsForm({ ...metricsForm, hips_cm: e.target.value })}
                  className="bg-background/50"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Brazo (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={metricsForm.arm_cm}
                  onChange={(e) => setMetricsForm({ ...metricsForm, arm_cm: e.target.value })}
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Muslo (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={metricsForm.thigh_cm}
                  onChange={(e) => setMetricsForm({ ...metricsForm, thigh_cm: e.target.value })}
                  className="bg-background/50"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Notas</Label>
              <Textarea
                placeholder="Observaciones..."
                value={metricsForm.notes}
                onChange={(e) => setMetricsForm({ ...metricsForm, notes: e.target.value })}
                rows={2}
                className="bg-background/50"
              />
            </div>
            <Button
              onClick={handleSaveMetrics}
              disabled={savingMetrics}
              className="w-full"
            >
              {savingMetrics ? "Guardando..." : "Registrar metricas"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
