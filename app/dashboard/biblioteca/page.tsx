import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BibliotecaList } from "@/components/biblioteca/biblioteca-list";

export default async function BibliotecaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "trainer"].includes(profile.role)) {
    redirect("/dashboard");
  }

  return <BibliotecaList profile={profile} />;
}
