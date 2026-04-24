import { requireApiContext } from "@/lib/api/auth";
import { fail, ok } from "@/lib/api/responses";

export const dynamic = "force-dynamic";

export async function POST() {
  const auth = await requireApiContext();
  if (!auth.ok) {
    return fail(auth.status, { code: auth.code, message: auth.message });
  }

  const organization = await auth.context.supabase.from("organizations").select("base_currency").eq("id", auth.context.orgId).single();
  if (organization.error || !organization.data) {
    return fail(404, { code: "ORG_NOT_FOUND", message: "Organization not found." });
  }

  const { error } = await auth.context.supabase.rpc("seed_default_accounts", {
    p_org_id: auth.context.orgId,
    p_currency: organization.data.base_currency
  });
  if (error) {
    return fail(400, { code: "DEFAULT_ACCOUNTS_FAILED", message: error.message });
  }

  await auth.context.supabase.from("audit_logs").insert({
    org_id: auth.context.orgId,
    user_id: auth.context.userId,
    entity_type: "account",
    entity_id: null,
    action: "seed_defaults",
    new_values: { source: "api/accounts/defaults" }
  });

  return ok({ seeded: true });
}
