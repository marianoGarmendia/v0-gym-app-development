import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const ADMIN_EMAIL = "admin@g10flow.com";
const ADMIN_PASSWORD = "G10Admin2024!";

export async function POST() {
  const supabase = await createClient();
  
  // Try to sign up the admin user
  const { data, error } = await supabase.auth.signUp({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    options: {
      data: {
        full_name: "Administrador",
        role: "admin",
      },
    },
  });

  if (error) {
    // If user already exists, that's fine
    if (error.message.includes("already registered")) {
      return NextResponse.json({ message: "Admin ya existe" });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ 
    message: "Admin creado. Revisa el email para confirmar.", 
    user: data.user?.email 
  });
}
