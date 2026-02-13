import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { EditRoutineForm } from "@/components/routines/edit-routine-form";

interface EditRoutinePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditRoutinePage({ params }: EditRoutinePageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "trainer" && profile.role !== "admin")) {
    redirect("/dashboard");
  }

  const { data: routine } = await supabase
    .from("routines")
    .select("id, trainer_id")
    .eq("id", id)
    .single();

  if (!routine || routine.trainer_id !== profile.id) {
    notFound();
  }

  const { data: students } = await supabase
    .from("trainer_students")
    .select(`
      *,
      student:profiles!trainer_students_student_id_fkey(*)
    `)
    .eq("trainer_id", profile.id);

  return (
    <EditRoutineForm
      routineId={id}
      trainerId={profile.id}
      students={students || []}
    />
  );
}
