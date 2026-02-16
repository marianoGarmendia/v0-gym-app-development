"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import {
  ChevronLeft,
  Target,
  Ruler,
  Scale,
  Heart,
  Dumbbell,
  Clock,
  User,
  Pencil,
  CalendarDays,
  Zap,
  AlertTriangle,
  Plus,
} from "lucide-react";
import type { Profile, BodyMetric } from "@/lib/types";
import Link from "next/link";
import { toast } from "sonner";

interface ProfileEvaluationProps {
  profile: Profile;
  bodyMetrics: BodyMetric[];
}

export function ProfileEvaluation({ profile, bodyMetrics: initialMetrics }: ProfileEvaluationProps) {
  const supabase = createClient();
  const [editOpen, setEditOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [bodyMetrics, setBodyMetrics] = useState(initialMetrics);
  const [metricsDialogOpen, setMetricsDialogOpen] = useState(false);
  const [savingMetrics, setSavingMetrics] = useState(false);

  const [form, setForm] = useState({
    objective: profile.objective || "",
    birth_date: profile.birth_date || "",
    gender: profile.gender || "",
    height_cm: profile.height_cm?.toString() || "",
    weight_kg: profile.weight_kg?.toString() || "",
    experience_level: profile.experience_level || "",
    injuries: profile.injuries || "",
    medical_notes: profile.medical_notes || "",
    desired_frequency: profile.desired_frequency?.toString() || "",
    notes: profile.notes || "",
  });

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

  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
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

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        objective: form.objective || null,
        birth_date: form.birth_date || null,
        gender: form.gender || null,
        height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
        experience_level: form.experience_level || null,
        injuries: form.injuries || null,
        medical_notes: form.medical_notes || null,
        desired_frequency: form.desired_frequency ? parseInt(form.desired_frequency) : null,
        notes: form.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    if (error) {
      toast.error("Error al guardar perfil");
    } else {
      toast.success("Perfil actualizado");
      setEditOpen(false);
    }
    setSavingProfile(false);
  };

  const handleSaveMetrics = async () => {
    setSavingMetrics(true);
    const insertData: Record<string, any> = { student_id: profile.id };
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

  const age = calculateAge(profile.birth_date);
  const hasProfileData = profile.objective || profile.experience_level || profile.height_cm || profile.weight_kg;
  const latestMetric = bodyMetrics[0];

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="font-bold text-lg">Evaluacion de perfil</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="w-4 h-4 mr-1" />
            Editar
          </Button>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* No profile data CTA */}
        {!hasProfileData && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-5 text-center">
              <User className="w-10 h-10 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-1">Completa tu perfil</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Agrega tu objetivo, datos fisicos y nivel de experiencia para que tu entrenador pueda personalizar tu rutina.
              </p>
              <Button onClick={() => setEditOpen(true)}>
                Completar perfil
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Objective & Goal */}
        <section>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Objetivo
          </h2>
          <Card className="border-border/50">
            <CardContent className="p-4">
              {profile.objective ? (
                <p className="text-sm">{profile.objective}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Sin objetivo definido</p>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Level, Frequency & Session */}
        <section>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Nivel y frecuencia
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-border/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Nivel</p>
                <p className="text-sm font-medium">
                  {getExperienceLabel(profile.experience_level) || "No definido"}
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Frecuencia</p>
                <p className="text-sm font-medium">
                  {profile.desired_frequency
                    ? `${profile.desired_frequency} veces/semana`
                    : "No definida"}
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Injuries & Limitations */}
        <section>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            Lesiones y limitaciones
          </h2>
          <Card className="border-border/50">
            <CardContent className="p-4 space-y-2">
              {profile.injuries ? (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Lesiones</p>
                  <p className="text-sm">{profile.injuries}</p>
                </div>
              ) : null}
              {profile.medical_notes ? (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Notas medicas</p>
                  <p className="text-sm">{profile.medical_notes}</p>
                </div>
              ) : null}
              {!profile.injuries && !profile.medical_notes && (
                <p className="text-sm text-muted-foreground">Sin lesiones ni limitaciones registradas</p>
              )}
              {profile.notes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Actividades complementarias</p>
                  <p className="text-sm">{profile.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Physical Data */}
        <section>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <Ruler className="w-4 h-4 text-primary" />
            Datos fisicos
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-border/50">
              <CardContent className="p-4 text-center">
                <Scale className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-lg font-bold">
                  {profile.weight_kg || "—"}
                </p>
                <p className="text-xs text-muted-foreground">kg</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4 text-center">
                <Ruler className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-lg font-bold">
                  {profile.height_cm || "—"}
                </p>
                <p className="text-xs text-muted-foreground">cm</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4 text-center">
                <CalendarDays className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-lg font-bold">
                  {age || "—"}
                </p>
                <p className="text-xs text-muted-foreground">anios</p>
              </CardContent>
            </Card>
          </div>
          {profile.gender && (
            <div className="mt-2">
              <Badge variant="secondary" className="text-xs">
                {getGenderLabel(profile.gender)}
              </Badge>
            </div>
          )}
        </section>

        {/* Body Metrics History */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-primary" />
              Metricas corporales
            </h2>
            <Button
              variant="outline"
              size="sm"
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
                  Sin metricas registradas. Registra tus medidas para ver tu evolucion.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {bodyMetrics.map((metric) => (
                <Card key={metric.id} className="border-border/50">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-2">
                      {new Date(metric.recorded_at).toLocaleDateString("es", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
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
        </section>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar mi perfil</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Objetivo de entrenamiento</Label>
              <Textarea
                placeholder="Ej: Ganar masa muscular, bajar de peso, mejorar resistencia..."
                value={form.objective}
                onChange={(e) => setForm({ ...form, objective: e.target.value })}
                rows={2}
                className="bg-background/50"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Fecha de nacimiento</Label>
                <Input
                  type="date"
                  value={form.birth_date}
                  onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label>Genero</Label>
                <Select
                  value={form.gender}
                  onValueChange={(v) => setForm({ ...form, gender: v })}
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
                  value={form.height_cm}
                  onChange={(e) => setForm({ ...form, height_cm: e.target.value })}
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label>Peso (kg)</Label>
                <Input
                  type="number"
                  placeholder="75"
                  value={form.weight_kg}
                  onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
                  className="bg-background/50"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Nivel de experiencia</Label>
                <Select
                  value={form.experience_level}
                  onValueChange={(v) => setForm({ ...form, experience_level: v })}
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
                <Label>Frecuencia (veces/sem)</Label>
                <Input
                  type="number"
                  placeholder="3"
                  min="1"
                  max="7"
                  value={form.desired_frequency}
                  onChange={(e) => setForm({ ...form, desired_frequency: e.target.value })}
                  className="bg-background/50"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Lesiones / limitaciones</Label>
              <Textarea
                placeholder="Ej: Dolor lumbar cronico, rodilla operada..."
                value={form.injuries}
                onChange={(e) => setForm({ ...form, injuries: e.target.value })}
                rows={2}
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Notas medicas</Label>
              <Textarea
                placeholder="Ej: Hipertenso controlado, medicacion..."
                value={form.medical_notes}
                onChange={(e) => setForm({ ...form, medical_notes: e.target.value })}
                rows={2}
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Actividades complementarias</Label>
              <Textarea
                placeholder="Ej: Crossfit 2 veces por semana, HIIT, natacion..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="bg-background/50"
              />
            </div>
            <Button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="w-full"
            >
              {savingProfile ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Body Metrics Dialog */}
      <Dialog open={metricsDialogOpen} onOpenChange={setMetricsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar metricas</DialogTitle>
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
    </div>
  );
}
