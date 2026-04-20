import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/types/database.types";

export type ApiContext = {
  supabase: ReturnType<typeof createSupabaseServerClient>;
  userId: string;
  orgId: string;
  role: string;
};

export type AuthResult =
  | { ok: true; context: ApiContext }
  | { ok: false; status: number; code: string; message: string };

export async function requireApiContext(): Promise<AuthResult> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, status: 401, code: "UNAUTHENTICATED", message: "Sign in to continue." };
  }

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("org_id, role, is_active")
    .eq("id", user.id)
    .single();
  const profile = profileData as ProfileRow | null;

  if (profileError || !profile?.org_id || !profile.is_active) {
    return {
      ok: false,
      status: 403,
      code: "ORG_ACCESS_REQUIRED",
      message: "Your user profile is not assigned to an active organization."
    };
  }

  return {
    ok: true,
    context: {
      supabase,
      userId: user.id,
      orgId: profile.org_id,
      role: profile.role
    }
  };
}
