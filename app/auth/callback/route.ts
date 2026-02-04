import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error("[v0] Auth callback error:", error.message);
      return NextResponse.redirect(`${origin}/auth/error?message=${encodeURIComponent(error.message)}`);
    }
  }

  // Redirect to dashboard after successful confirmation
  return NextResponse.redirect(`${origin}/dashboard`);
}
