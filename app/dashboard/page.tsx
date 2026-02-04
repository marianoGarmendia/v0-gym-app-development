import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { StudentDashboard } from "@/components/dashboard/student-dashboard";
import { TrainerDashboard } from "@/components/dashboard/trainer-dashboard";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";

export default async function DashboardPage() {
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

  if (profile.role === "admin") {
    return <AdminDashboard profile={profile} />;
  }

  if (profile.role === "trainer") {
    return <TrainerDashboard profile={profile} />;
  }

  return <StudentDashboard profile={profile} />;
}
