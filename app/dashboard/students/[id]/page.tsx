import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { StudentDetail } from "@/components/students/student-detail";

interface StudentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function StudentDetailPage({ params }: StudentDetailPageProps) {
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

  if (!profile || profile.role !== "trainer") {
    redirect("/dashboard");
  }

  // Verify trainer has access to this student
  const { data: trainerStudent } = await supabase
    .from("trainer_students")
    .select("*")
    .eq("trainer_id", profile.id)
    .eq("student_id", id)
    .single();

  if (!trainerStudent) {
    notFound();
  }

  // Fetch student profile
  const { data: student } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (!student) {
    notFound();
  }

  // Fetch trainer's routines (for assignment dialog)
  const { data: trainerRoutines } = await supabase
    .from("routines")
    .select("id, name, description, duration_type")
    .eq("trainer_id", profile.id)
    .order("created_at", { ascending: false });

  // Fetch student's routine assignments with routine details
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: assignments } = await supabase
    .from("routine_assignments")
    .select(`
      id,
      routine_id,
      student_id,
      assigned_at,
      visible,
      routine:routines(id, name, description, duration_type)
    `)
    .eq("student_id", id);

  return (
    <StudentDetail
      student={student}
      trainerRoutines={trainerRoutines || []}
      initialAssignments={(assignments || []) as any}
    />
  );
}
