import { requireApiContext, type ApiContext } from "@/lib/api/auth";
import { parseQuotationFallbackNotes, updateQuotationDocument } from "@/lib/commercial/quotations";
import { fail, ok } from "@/lib/api/responses";
import { quotationSchema } from "@/lib/validations/commercial.schema";
import { assertPeriodUnlocked } from "@/lib/period-locks";
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
    entity_type: "quotation",
    entity_id: entityId,
    action,
    new_values: values
  });
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });

  const { data: quotation, error } = await auth.context.supabase
    .from("quotations")
    .select("*")
    .eq("org_id", auth.context.orgId)
    .eq("id", params.id)
    .single();

  if (error || !quotation) return fail(404, { code: "NOT_FOUND", message: "Quotation not found." });

  const [{ data: customer }, lineQuery] = await Promise.all([
    auth.context.supabase.from("contacts").select("id, display_name, email").eq("org_id", auth.context.orgId).eq("id", quotation.contact_id).maybeSingle(),
    auth.context.supabase.from("quotation_lines").select("*").eq("org_id", auth.context.orgId).eq("quotation_id", params.id).order("display_order", { ascending: true })
  ]);

  const fallback = parseQuotationFallbackNotes(quotation.notes);
  const lineItems = lineQuery.error ? fallback.meta?.line_items ?? [] : (lineQuery.data ?? []);

  return ok({
    ...quotation,
    notes: fallback.notes,
    place_of_supply: quotation.place_of_supply ?? fallback.meta?.place_of_supply ?? null,
    template_type: quotation.template_type ?? fallback.meta?.template_type ?? "classic",
    terms: quotation.terms ?? fallback.meta?.terms ?? null,
    customer: customer?.display_name ?? "Customer",
    customer_email: customer?.email ?? null,
    line_items: lineItems
  });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });

  const { data: existing, error: existingError } = await auth.context.supabase
    .from("quotations")
    .select("*")
    .eq("org_id", auth.context.orgId)
    .eq("id", params.id)
    .single();

  if (existingError || !existing) return fail(404, { code: "NOT_FOUND", message: "Quotation not found." });

  const json = await parseJson(request);
  const merged = { ...existing, ...json };
  const parsed = quotationSchema.safeParse(merged);
  if (!parsed.success) {
    return fail(422, { code: "VALIDATION_FAILED", message: "The quotation payload is invalid.", details: parsed.error.flatten() });
  }

  const lockResponse = await assertPeriodUnlocked(auth.context, parsed.data.issue_date, "sales");
  if (lockResponse) return lockResponse;

  try {
    const { quotation } = await updateQuotationDocument(auth.context, params.id, parsed.data);
    await audit(auth.context, "update", params.id, json as Json);
    return ok(quotation);
  } catch (error) {
    return fail(400, { code: "UPDATE_FAILED", message: error instanceof Error ? error.message : "Quotation could not be updated." });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });

  const { data: existing, error: existingError } = await auth.context.supabase
    .from("quotations")
    .select("id, status, issue_date")
    .eq("org_id", auth.context.orgId)
    .eq("id", params.id)
    .single();

  if (existingError || !existing) return fail(404, { code: "NOT_FOUND", message: "Quotation not found." });
  if (existing.status === "accepted") {
    return fail(409, { code: "DELETE_NOT_ALLOWED", message: "Accepted quotations cannot be deleted." });
  }

  const lockResponse = await assertPeriodUnlocked(auth.context, String(existing.issue_date), "sales");
  if (lockResponse) return lockResponse;

  const { error } = await auth.context.supabase.from("quotations").delete().eq("org_id", auth.context.orgId).eq("id", params.id);
  if (error) return fail(400, { code: "DELETE_FAILED", message: error.message });

  await audit(auth.context, "delete", params.id, { id: params.id } as Json);
  return ok({ id: params.id });
}
