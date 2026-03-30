import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  // TODO: reemplazar "library_routines" con la tabla real cuando esté lista
  const { data, error } = await supabase
    .from("library_routines")
    .select("*")
    .order("name");

  if (error) {
    return NextResponse.json({ routines: [] });
  }

  return NextResponse.json({ routines: data });
}
