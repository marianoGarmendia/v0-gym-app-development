import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { StudentRoutinesList } from "@/components/routines/student-routines-list";
import { TrainerRoutinesList } from "@/components/routines/trainer-routines-list";

export default async function RoutinesPage() {
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

  if (profile.role === "trainer" || profile.role === "admin") {
    return <TrainerRoutinesList profile={profile} />;
  }

  return <StudentRoutinesList profile={profile} />;
}
