import { requireApiContext, type ApiContext } from "@/lib/api/auth";
import { parseCreditNoteFallbackNotes, updateCreditNoteDocument } from "@/lib/commercial/adjustment-documents";
import { fail, ok } from "@/lib/api/responses";
import { assertPeriodUnlocked } from "@/lib/period-locks";
import { creditNoteSchema } from "@/lib/validations/commercial.schema";
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
    entity_type: "credit_note",
    entity_id: entityId,
    action,
    new_values: values
  });
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });

  const { data: creditNote, error } = await auth.context.supabase
    .from("credit_notes")
    .select("*")
    .eq("org_id", auth.context.orgId)
    .eq("id", params.id)
    .single();

  if (error || !creditNote) return fail(404, { code: "NOT_FOUND", message: "Credit note not found." });

  const [{ data: customer }, { data: invoice }] = await Promise.all([
    auth.context.supabase.from("contacts").select("id, display_name, email").eq("org_id", auth.context.orgId).eq("id", creditNote.contact_id).maybeSingle(),
    creditNote.invoice_id
      ? auth.context.supabase.from("invoices").select("id, invoice_number").eq("org_id", auth.context.orgId).eq("id", creditNote.invoice_id).maybeSingle()
      : Promise.resolve({ data: null })
  ]);

  const fallback = parseCreditNoteFallbackNotes(creditNote.notes);
  return ok({
    ...creditNote,
    notes: fallback.notes,
    customer: customer?.display_name ?? "Customer",
    customer_email: customer?.email ?? null,
    related_invoice_number: invoice?.invoice_number ?? null,
    line_items: fallback.meta?.line_items ?? []
  });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });

  const { data: existing, error: existingError } = await auth.context.supabase
    .from("credit_notes")
    .select("*")
    .eq("org_id", auth.context.orgId)
    .eq("id", params.id)
    .single();

  if (existingError || !existing) return fail(404, { code: "NOT_FOUND", message: "Credit note not found." });

  const json = await parseJson(request);
  const merged = { ...existing, ...json };
  const parsed = creditNoteSchema.safeParse(merged);
  if (!parsed.success) {
    return fail(422, { code: "VALIDATION_FAILED", message: "The credit note payload is invalid.", details: parsed.error.flatten() });
  }

  const lockResponse = await assertPeriodUnlocked(auth.context, parsed.data.issue_date, "sales");
  if (lockResponse) return lockResponse;

  try {
    const { creditNote } = await updateCreditNoteDocument(auth.context, params.id, parsed.data);
    await audit(auth.context, "update", params.id, json as Json);
    return ok(creditNote);
  } catch (error) {
    return fail(400, { code: "UPDATE_FAILED", message: error instanceof Error ? error.message : "Credit note could not be updated." });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });

  const { data: existing, error: existingError } = await auth.context.supabase
    .from("credit_notes")
    .select("id, status, issue_date")
    .eq("org_id", auth.context.orgId)
    .eq("id", params.id)
    .single();

  if (existingError || !existing) return fail(404, { code: "NOT_FOUND", message: "Credit note not found." });
  if (String(existing.status) === "applied") {
    return fail(409, { code: "DELETE_NOT_ALLOWED", message: "Applied credit notes cannot be deleted." });
  }

  const lockResponse = await assertPeriodUnlocked(auth.context, String(existing.issue_date), "sales");
  if (lockResponse) return lockResponse;

  const { error } = await auth.context.supabase.from("credit_notes").delete().eq("org_id", auth.context.orgId).eq("id", params.id);
  if (error) return fail(400, { code: "DELETE_FAILED", message: error.message });

  await audit(auth.context, "delete", params.id, { id: params.id } as Json);
  return ok({ id: params.id });
}
