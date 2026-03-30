import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: routineId } = await params;
  const { studentId } = await request.json();

  if (!studentId) {
    return NextResponse.json({ error: "studentId requerido" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile || !["trainer", "admin"].includes(profile.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // TODO: reemplazar "library_routine_assignments" con la tabla real cuando esté lista
  const { error } = await supabase.from("library_routine_assignments").insert({
    tenant_id: profile.tenant_id,
    library_routine_id: routineId,
    student_id: studentId,
    trainer_id: user.id,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Ya asignada" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
