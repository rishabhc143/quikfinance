import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicEnv } from "@/lib/env";

const publicPaths = ["/login", "/register", "/auth/callback", "/portal", "/api/public"];
const onboardingPaths = ["/company-setup", "/settings", "/settings/company"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { supabaseUrl, supabasePublishableKey } = getPublicEnv();
  if (!supabaseUrl || !supabasePublishableKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const isPublic = publicPaths.some((path) => request.nextUrl.pathname.startsWith(path));
  if (!user && !isPublic && !request.nextUrl.pathname.startsWith("/api")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  let setupCompleted = true;
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("org_id").eq("id", user.id).single();
    if (profile?.org_id) {
      const { data: organization } = await supabase.from("organizations").select("setup_completed").eq("id", profile.org_id).single();
      setupCompleted = Boolean(organization?.setup_completed);
    }
  }

  const isOnboardingPath = onboardingPaths.some((path) => request.nextUrl.pathname.startsWith(path));
  if (user && !setupCompleted && !isOnboardingPath && !request.nextUrl.pathname.startsWith("/api")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/company-setup";
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isPublic) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = setupCompleted ? "/dashboard" : "/company-setup";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
