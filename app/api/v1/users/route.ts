import { NextRequest } from "next/server";
import { getServerEnv } from "@/lib/env";
import { requireApiContext } from "@/lib/api/auth";
import { fail, ok } from "@/lib/api/responses";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AdminAuthUser = {
  id: string;
  email?: string | null;
  created_at?: string;
  last_sign_in_at?: string | null;
  invited_at?: string | null;
  user_metadata?: {
    full_name?: string | null;
  };
};

function canManageUsers(role: string) {
  return role === "owner" || role === "admin";
}

async function listAllUsers(admin: ReturnType<typeof createSupabaseAdminClient>) {
  const users: AdminAuthUser[] = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw error;
    }

    const batch = (data?.users ?? []) as AdminAuthUser[];
    users.push(...batch);

    if (batch.length < perPage) {
      break;
    }

    page += 1;
  }

  return users;
}

export async function GET() {
  const auth = await requireApiContext();
  if (!auth.ok) {
    return fail(auth.status, { code: auth.code, message: auth.message });
  }

  try {
    const [profilesResult, authUsers] = await Promise.all([
      auth.context.supabase
        .from("profiles")
        .select("id, full_name, role, is_active, created_at")
        .eq("org_id", auth.context.orgId)
        .order("created_at", { ascending: false }),
      listAllUsers(createSupabaseAdminClient())
    ]);

    if (profilesResult.error) {
      return fail(500, { code: "LIST_FAILED", message: profilesResult.error.message });
    }

    const authUserMap = new Map(authUsers.map((user) => [user.id, user]));
    const rows = (profilesResult.data ?? []).map((profile) => {
      const authUser = authUserMap.get(profile.id);
      const status = !profile.is_active ? "inactive" : authUser?.last_sign_in_at ? "active" : authUser?.invited_at ? "invited" : "active";

      return {
        id: profile.id,
        name: profile.full_name ?? authUser?.user_metadata?.full_name ?? "-",
        email: authUser?.email ?? "-",
        role: profile.role,
        status,
        last_sign_in_at: authUser?.last_sign_in_at ?? null,
        created_at: profile.created_at
      };
    });

    return ok(rows);
  } catch (error) {
    return fail(500, { code: "LIST_FAILED", message: error instanceof Error ? error.message : "Users could not be loaded." });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiContext();
  if (!auth.ok) {
    return fail(auth.status, { code: auth.code, message: auth.message });
  }

  if (!canManageUsers(auth.context.role)) {
    return fail(403, { code: "INSUFFICIENT_ROLE", message: "Only owners and admins can invite users." });
  }

  let body: { email?: string; full_name?: string; role?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return fail(400, { code: "INVALID_JSON", message: "The request body must be valid JSON." });
  }

  const email = body.email?.trim().toLowerCase();
  const fullName = body.full_name?.trim() || null;
  const role = body.role?.trim() || "member";

  if (!email || !email.includes("@")) {
    return fail(422, { code: "VALIDATION_FAILED", message: "A valid email is required." });
  }

  if (!["owner", "admin", "accountant", "member", "viewer"].includes(role)) {
    return fail(422, { code: "VALIDATION_FAILED", message: "The selected role is invalid." });
  }

  try {
    const admin = createSupabaseAdminClient();
    const existingUsers = await listAllUsers(admin);
    const existingAuthUser = existingUsers.find((user) => user.email?.toLowerCase() === email);

    let userId = existingAuthUser?.id ?? null;

    if (!userId) {
      const inviteResponse = await admin.auth.admin.inviteUserByEmail(email, {
        data: {
          full_name: fullName,
          invited_org_id: auth.context.orgId,
          invited_role: role
        },
        redirectTo: `${getServerEnv().appUrl}/auth/callback`
      });

      if (inviteResponse.error || !inviteResponse.data.user) {
        return fail(400, { code: "INVITE_FAILED", message: inviteResponse.error?.message ?? "The invitation could not be created." });
      }

      userId = inviteResponse.data.user.id;
    }

    const profilePayload = {
      id: userId,
      org_id: auth.context.orgId,
      full_name: fullName,
      role,
      is_active: true
    };

    const { error: profileError } = await admin.from("profiles").upsert(profilePayload, { onConflict: "id" });
    if (profileError) {
      return fail(400, { code: "PROFILE_UPDATE_FAILED", message: profileError.message });
    }

    await admin.from("audit_logs").insert({
      org_id: auth.context.orgId,
      user_id: auth.context.userId,
      entity_type: "user",
      entity_id: userId,
      action: existingAuthUser ? "assign" : "invite",
      new_values: { email, full_name: fullName, role }
    });

    return ok({ id: userId, email, full_name: fullName, role }, undefined, { status: 201 });
  } catch (error) {
    return fail(500, { code: "INVITE_FAILED", message: error instanceof Error ? error.message : "The invitation could not be created." });
  }
}
