import { requireApiContext } from "@/lib/api/auth";
import { fail, ok } from "@/lib/api/responses";

export const dynamic = "force-dynamic";

async function parseJson(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });

  const { data, error } = await auth.context.supabase
    .from("ocr_documents")
    .select("id, created_at, source_name, document_type, status, extracted_fields, linked_entity_id, notes")
    .eq("org_id", auth.context.orgId)
    .eq("id", params.id)
    .single();

  if (error || !data) return fail(404, { code: "NOT_FOUND", message: "OCR document not found." });
  return ok(data);
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });

  const json = await parseJson(request);
  const override = typeof json.extracted_fields_override === "object" && json.extracted_fields_override !== null && !Array.isArray(json.extracted_fields_override)
    ? json.extracted_fields_override
    : null;

  const { data: existing, error: existingError } = await auth.context.supabase
    .from("ocr_documents")
    .select("id, extracted_fields")
    .eq("org_id", auth.context.orgId)
    .eq("id", params.id)
    .single();

  if (existingError || !existing) return fail(404, { code: "NOT_FOUND", message: "OCR document not found." });

  const { data, error } = await auth.context.supabase
    .from("ocr_documents")
    .update({
      source_name: typeof json.source_name === "string" ? json.source_name : undefined,
      source_text: typeof json.source_text === "string" ? json.source_text : undefined,
      notes: typeof json.notes === "string" ? json.notes : undefined,
      extracted_fields: override ? { ...(existing.extracted_fields ?? {}), ...override } : existing.extracted_fields,
      status: "reviewed"
    })
    .eq("org_id", auth.context.orgId)
    .eq("id", params.id)
    .select("id, created_at, source_name, document_type, status, extracted_fields, linked_entity_id, notes")
    .single();

  if (error || !data) return fail(400, { code: "UPDATE_FAILED", message: error?.message ?? "OCR document could not be updated." });
  return ok(data);
}
