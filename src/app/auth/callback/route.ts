import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const errorDescription = searchParams.get("error_description");

  if (errorDescription) {
    const url = new URL("/signin", origin);
    url.searchParams.set("error", errorDescription);
    return NextResponse.redirect(url);
  }

  if (!code) {
    return NextResponse.redirect(new URL("/signin", origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const url = new URL("/signin", origin);
    url.searchParams.set("error", error.message);
    return NextResponse.redirect(url);
  }

  const safeNext = next.startsWith("/") ? next : "/";
  return NextResponse.redirect(new URL(safeNext, origin));
}
