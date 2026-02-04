import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { RoutineViewer } from "@/components/routines/routine-viewer";

interface RoutinePageProps {
  params: Promise<{ id: string }>;
}

export default async function RoutinePage({ params }: RoutinePageProps) {
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

  return <RoutineViewer routine={routine} profile={profile} />;
}
