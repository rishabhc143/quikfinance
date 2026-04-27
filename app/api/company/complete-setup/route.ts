import { fail, ok } from "@/lib/api/responses";
import { requireApiContext } from "@/lib/api/auth";
import { loadCompanySetupSnapshot } from "@/lib/company-setup";

export const dynamic = "force-dynamic";

export async function POST() {
  const auth = await requireApiContext();
  if (!auth.ok) {
    return fail(auth.status, { code: auth.code, message: auth.message });
  }

  const snapshot = await loadCompanySetupSnapshot(auth.context);
  if (!snapshot.setup_completed) {
    return fail(422, {
      code: "SETUP_INCOMPLETE",
      message: "Company setup is incomplete.",
      details: { required_missing: snapshot.required_missing, checklist: snapshot.checklist }
    });
  }

  const { data: organization, error: organizationError } = await auth.context.supabase
    .from("organizations")
    .select("*")
    .eq("id", auth.context.orgId)
    .single();
  if (organizationError || !organization) {
    return fail(404, { code: "ORG_NOT_FOUND", message: organizationError?.message ?? "Organization not found." });
  }

  const address =
    typeof organization.address === "object" && organization.address !== null && !Array.isArray(organization.address)
      ? (organization.address as Record<string, unknown>)
      : {};
  const meta =
    typeof address._meta === "object" && address._meta !== null && !Array.isArray(address._meta)
      ? (address._meta as Record<string, unknown>)
      : {};

  const updatePayload = Object.prototype.hasOwnProperty.call(organization, "setup_completed")
    ? { setup_completed: true }
    : {
        address: {
          ...address,
          _meta: {
            ...meta,
            setup_completed: true
          }
        }
      };

  const { error } = await auth.context.supabase.from("organizations").update(updatePayload).eq("id", auth.context.orgId);
  if (error) {
    return fail(400, { code: "COMPLETE_SETUP_FAILED", message: error.message });
  }

  await auth.context.supabase.from("audit_logs").insert({
    org_id: auth.context.orgId,
    user_id: auth.context.userId,
    entity_type: "company",
    entity_id: auth.context.orgId,
    action: "complete_setup",
    new_values: { setup_completed: true }
  });

  return ok({ setup_completed: true, checklist: snapshot.checklist });
}
