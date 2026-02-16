import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileEvaluation } from "@/components/dashboard/profile-evaluation";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  // Fetch latest body metrics
  const { data: bodyMetrics } = await supabase
    .from("body_metrics")
    .select("*")
    .eq("student_id", profile.id)
    .order("recorded_at", { ascending: false })
    .limit(10);

  return (
    <ProfileEvaluation
      profile={profile}
      bodyMetrics={bodyMetrics || []}
    />
  );
}
