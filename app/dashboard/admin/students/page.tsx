import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminStudentsList } from "@/components/admin/admin-students-list";

/*
 1. Week comments (tienen routine_id directo)                                   
                                      
  supabase                                                                       
    .from("comments")                                                            
    .select("*, routine:routines(name)")
    .eq("student_id", student.id)
    .eq("comment_type", "week")

  - "*" — trae todas las columnas de comments
  - routine:routines(name) — como comments tiene routine_id, Supabase hace el
  join automático: busca en routines donde routines.id = comments.routine_id, y
  trae solo name. Lo guarda en routine.

  Resultado:
  {
    "id": "...",
    "content": "Buena semana",
    "routine_id": "abc",
    "week_number": 1,
    "routine": { "name": "Fuerza - Principiantes" }
  }

  2. Day comments (tienen workout_day_id, no routine_id)

  supabase
    .from("comments")
    .select("*, workout_day:workout_days(name, day_number,
  routine:routines(name))")
    .eq("student_id", student.id)
    .eq("comment_type", "day")

  Acá hay un join anidado:
  1. workout_day:workout_days(...) — join de comments → workout_days via
  workout_day_id
  2. Dentro, routine:routines(name) — join de workout_days → routines via
  routine_id que tiene workout_days

  Resultado:
  {
    "id": "...",
    "content": "Me costó el día",
    "workout_day_id": "xyz",
    "workout_day": {
      "name": "Pecho y tríceps",
      "day_number": 1,
      "routine": { "name": "Fuerza - Principiantes" }
    }
  }

  3. Exercise comments (tienen exercise_id, sin routine_id ni workout_day_id)

  supabase
    .from("comments")
    .select("*, exercise:exercises(name,
  workout_day:workout_days(routine:routines(name)))")
    .eq("student_id", student.id)
    .eq("comment_type", "exercise")

  Acá hay 3 niveles de join:
  1. exercise:exercises(...) — comments → exercises via exercise_id
  2. Dentro, workout_day:workout_days(...) — exercises → workout_days via
  workout_day_id
  3. Dentro, routine:routines(name) — workout_days → routines via routine_id

  Resultado:
  {
    "id": "...",
    "content": "Muy pesado",
    "exercise_id": "def",
    "exercise": {
      "name": "Press banca",
      "workout_day": {
        "routine": { "name": "Fuerza - Principiantes" }
      }
    }
  }

  Resumen

  La clave es que Supabase detecta las foreign keys automáticamente. Si una tabla
   tiene una columna que referencia a otra (ej: workout_day_id →
  workout_days.id), podés hacer el join simplemente escribiendo
  workout_day:workout_days(columnas) dentro del select. Y podés anidarlos para
  recorrer la cadena: comments → exercises → workout_days → routines.
*/

export default async function AdminStudentsPage() {
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

  if (!profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  return <AdminStudentsList />;
}
