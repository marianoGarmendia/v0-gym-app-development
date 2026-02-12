"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Users, Plus, Search, UserPlus, Mail, Loader2 } from "lucide-react";
import type { Profile, TrainerStudent } from "@/lib/types";
import { toast } from "sonner";

interface StudentsManagerProps {
  trainerId: string;
}

interface StudentWithProfile extends TrainerStudent {
  student: Profile;
}

export function StudentsManager({ trainerId }: StudentsManagerProps) {
  const [students, setStudents] = useState<StudentWithProfile[]>([]);
  const [allStudents, setAllStudents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addingStudent, setAddingStudent] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      const [myStudentsRes, allStudentsRes] = await Promise.all([
        supabase
          .from("trainer_students")
          .select(`
            *,
            student:profiles!trainer_students_student_id_fkey(*)
          `)
          .eq("trainer_id", trainerId),
        supabase
          .from("profiles")
          .select("*")
          .eq("role", "student"),
      ]);

      if (myStudentsRes.data) {
        setStudents(myStudentsRes.data as StudentWithProfile[]);
      }
      if (allStudentsRes.data) {
        setAllStudents(allStudentsRes.data);
      }
      setLoading(false);
    }

    fetchData();
  }, [trainerId, supabase]);

  const handleAddStudent = async (studentId: string) => {
    setAddingStudent(studentId);

    const { error } = await supabase.from("trainer_students").insert({
      trainer_id: trainerId,
      student_id: studentId,
    });

    if (error) {
      if (error.code === "23505") {
        toast.error("Este alumno ya esta asignado");
      } else {
        toast.error("Error al agregar alumno");
      }
    } else {
      const student = allStudents.find((s) => s.id === studentId);
      if (student) {
        setStudents((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            trainer_id: trainerId,
            student_id: studentId,
            created_at: new Date().toISOString(),
            student,
          },
        ]);
      }
      toast.success("Alumno agregado exitosamente");
      setAddDialogOpen(false);
    }

    setAddingStudent(null);
  };

  const myStudentIds = students.map((s) => s.student_id);
  const availableStudents = allStudents.filter(
    (s) =>
      !myStudentIds.includes(s.id) &&
      (s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-4 space-y-6">
      <header className="pt-2 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mis alumnos</h1>
          <p className="text-muted-foreground text-sm">
            Gestiona los alumnos asignados
          </p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-1" />
              Agregar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar alumno</DialogTitle>
              <DialogDescription>
                Busca y selecciona un alumno para agregarlo a tu lista
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {availableStudents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No se encontraron alumnos disponibles
                  </p>
                ) : (
                  availableStudents.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                          {student.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{student.full_name}</p>
                          <p className="text-xs text-muted-foreground">{student.email}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAddStudent(student.id)}
                        disabled={addingStudent === student.id}
                      >
                        {addingStudent === student.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <UserPlus className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : students.length === 0 ? (
        <Card className="border-dashed border-2 border-border/50">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-2">Sin alumnos</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Agrega alumnos para asignarles rutinas
            </p>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Agregar alumno
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {students.map((s) => (
            <Card key={s.id} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                    {s.student.full_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{s.student.full_name}</h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Mail className="w-3 h-3" />
                      <span className="truncate">{s.student.email}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
