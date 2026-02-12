import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CreateRoutineForm } from "@/components/routines/create-routine-form";

export default async function NewRoutinePage() {
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

  // Fetch trainer's students
  const { data: students } = await supabase
    .from("trainer_students")
    .select(`
      *,
      student:profiles!trainer_students_student_id_fkey(*)
    `)
    .eq("trainer_id", profile.id);

  return <CreateRoutineForm trainerId={profile.id} students={students || []} />;
}
