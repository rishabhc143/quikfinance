import { requireApiContext, type ApiContext } from "@/lib/api/auth";
import { parseVendorCreditFallbackNotes, updateVendorCreditDocument } from "@/lib/commercial/adjustment-documents";
import { fail, ok } from "@/lib/api/responses";
import { assertPeriodUnlocked } from "@/lib/period-locks";
import { vendorCreditSchema } from "@/lib/validations/commercial.schema";
import type { Json } from "@/types/database.types";

export const dynamic = "force-dynamic";

async function parseJson(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function audit(context: ApiContext, action: string, entityId: string, values: Json) {
  await context.supabase.from("audit_logs").insert({
    org_id: context.orgId,
    user_id: context.userId,
    entity_type: "vendor_credit",
    entity_id: entityId,
    action,
    new_values: values
  });
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });

  const { data: vendorCredit, error } = await auth.context.supabase
    .from("vendor_credits")
    .select("*")
    .eq("org_id", auth.context.orgId)
    .eq("id", params.id)
    .single();

  if (error || !vendorCredit) return fail(404, { code: "NOT_FOUND", message: "Vendor credit not found." });

  const [{ data: vendor }, { data: bill }] = await Promise.all([
    auth.context.supabase.from("contacts").select("id, display_name, email").eq("org_id", auth.context.orgId).eq("id", vendorCredit.contact_id).maybeSingle(),
    vendorCredit.bill_id
      ? auth.context.supabase.from("bills").select("id, bill_number").eq("org_id", auth.context.orgId).eq("id", vendorCredit.bill_id).maybeSingle()
      : Promise.resolve({ data: null })
  ]);

  const fallback = parseVendorCreditFallbackNotes(vendorCredit.notes);
  return ok({
    ...vendorCredit,
    notes: fallback.notes,
    vendor: vendor?.display_name ?? "Vendor",
    vendor_email: vendor?.email ?? null,
    related_bill_number: bill?.bill_number ?? null,
    line_items: fallback.meta?.line_items ?? []
  });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });

  const { data: existing, error: existingError } = await auth.context.supabase
    .from("vendor_credits")
    .select("*")
    .eq("org_id", auth.context.orgId)
    .eq("id", params.id)
    .single();

  if (existingError || !existing) return fail(404, { code: "NOT_FOUND", message: "Vendor credit not found." });

  const json = await parseJson(request);
  const merged = { ...existing, ...json };
  const parsed = vendorCreditSchema.safeParse(merged);
  if (!parsed.success) {
    return fail(422, { code: "VALIDATION_FAILED", message: "The vendor credit payload is invalid.", details: parsed.error.flatten() });
  }

  const lockResponse = await assertPeriodUnlocked(auth.context, parsed.data.issue_date, "purchases");
  if (lockResponse) return lockResponse;

  try {
    const { vendorCredit } = await updateVendorCreditDocument(auth.context, params.id, parsed.data);
    await audit(auth.context, "update", params.id, json as Json);
    return ok(vendorCredit);
  } catch (error) {
    return fail(400, { code: "UPDATE_FAILED", message: error instanceof Error ? error.message : "Vendor credit could not be updated." });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });

  const { data: existing, error: existingError } = await auth.context.supabase
    .from("vendor_credits")
    .select("id, status, issue_date")
    .eq("org_id", auth.context.orgId)
    .eq("id", params.id)
    .single();

  if (existingError || !existing) return fail(404, { code: "NOT_FOUND", message: "Vendor credit not found." });
  if (String(existing.status) === "applied") {
    return fail(409, { code: "DELETE_NOT_ALLOWED", message: "Applied vendor credits cannot be deleted." });
  }

  const lockResponse = await assertPeriodUnlocked(auth.context, String(existing.issue_date), "purchases");
  if (lockResponse) return lockResponse;

  const { error } = await auth.context.supabase.from("vendor_credits").delete().eq("org_id", auth.context.orgId).eq("id", params.id);
  if (error) return fail(400, { code: "DELETE_FAILED", message: error.message });

  await audit(auth.context, "delete", params.id, { id: params.id } as Json);
  return ok({ id: params.id });
}
