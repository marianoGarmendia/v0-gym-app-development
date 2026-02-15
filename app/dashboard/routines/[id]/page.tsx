import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { RoutineViewer } from "@/components/routines/routine-viewer";

interface RoutinePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ week?: string; day?: string }>;
}

export default async function RoutinePage({ params, searchParams }: RoutinePageProps) {
  const { id } = await params;
  const { week, day } = await searchParams;
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

  if (!profile) {
    redirect("/auth/login");
  }

  // Fetch routine with workout days and exercises
  const { data: routine } = await supabase
    .from("routines")
    .select(`
      *,
      trainer:profiles!routines_trainer_id_fkey(*),
      workout_days(
        *,
        exercises(*)
      )
    `)
    .eq("id", id)
    .single();

  if (!routine) {
    notFound();
  }

  // Fetch trainer's students and current assignments (for trainers/admins)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let trainerStudents: any[] = [];
  let assignedStudentIds: string[] = [];

  if (profile.role === "trainer" || profile.role === "admin") {
    const { data: ts } = await supabase
      .from("trainer_students")
      .select("student_id, student:profiles!trainer_students_student_id_fkey(id, full_name, email)")
      .eq("trainer_id", profile.id);

    trainerStudents = ts || [];

    const { data: assignments } = await supabase
      .from("routine_assignments")
      .select("student_id")
      .eq("routine_id", id);

    assignedStudentIds = (assignments || []).map((a) => a.student_id);
  }

  // Check if user has access to this routine
  if (profile.role === "student") {
    const { data: assignment } = await supabase
      .from("routine_assignments")
      .select("id")
      .eq("routine_id", id)
      .eq("student_id", profile.id)
      .single();

    if (!assignment) {
      notFound();
    }
  } else if (profile.role === "trainer" && routine.trainer_id !== profile.id) {
    notFound();
  }

  return (
    <RoutineViewer
      routine={routine}
      profile={profile}
      trainerStudents={trainerStudents}
      assignedStudentIds={assignedStudentIds}
      initialWeek={week ? parseInt(week) : undefined}
      initialDay={day ? parseInt(day) : undefined}
    />
  );
}
