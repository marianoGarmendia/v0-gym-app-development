import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { StudentsManager } from "@/components/students/students-manager";

export default async function StudentsPage() {
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

  return <StudentsManager trainerId={profile.id} />;
}
