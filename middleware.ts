import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { response, user, supabase } = await updateSession(request);
  const path = request.nextUrl.pathname;

  // Customer routes
  if (path.startsWith("/app")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/sign-in";
      url.searchParams.set("next", path);
      return NextResponse.redirect(url);
    }
  }

  // Washer routes
  if (path.startsWith("/pro")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/sign-in";
      url.searchParams.set("next", path);
      url.searchParams.set("role", "washer");
      return NextResponse.redirect(url);
    }
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profile && profile.role !== "washer" && profile.role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/wash";
      return NextResponse.redirect(url);
    }
  }

  // Partner dashboard
  if (path === "/partner/dashboard") {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/sign-in";
      url.searchParams.set("next", path);
      return NextResponse.redirect(url);
    }
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profile && profile.role !== "partner_owner" && profile.role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/partner/apply";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)",
  ],
};
