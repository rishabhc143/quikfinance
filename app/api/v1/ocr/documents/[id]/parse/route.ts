import { canWriteData, requireApiContext } from "@/lib/api/auth";
import { errorMessage, fail, ok } from "@/lib/api/responses";
import { extractDocumentFields } from "@/lib/ocr/parser";

export const dynamic = "force-dynamic";

async function parseJson(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) {
    return fail(auth.status, { code: auth.code, message: auth.message });
  }
  if (!canWriteData(auth.context.role)) {
    return fail(403, { code: "READ_ONLY_ROLE", message: "Your role is read-only." });
  }

  try {
    const json = await parseJson(request);
    const { data: document, error } = await auth.context.supabase
      .from("ocr_documents")
      .select("id, source_text, extracted_fields")
      .eq("org_id", auth.context.orgId)
      .eq("id", params.id)
      .single();

    if (error || !document) {
      return fail(404, { code: "NOT_FOUND", message: "OCR document not found." });
    }

    const sourceText = typeof json.source_text === "string" ? json.source_text : String(document.source_text ?? "");
    if (!sourceText.trim()) {
      return fail(422, { code: "SOURCE_TEXT_REQUIRED", message: "Paste OCR text before parsing this document." });
    }

    const extractedFields = {
      ...(typeof document.extracted_fields === "object" && document.extracted_fields ? document.extracted_fields : {}),
      ...extractDocumentFields(sourceText)
    };

    const { data: updated, error: updateError } = await auth.context.supabase
      .from("ocr_documents")
      .update({
        source_name: typeof json.source_name === "string" ? json.source_name : undefined,
        source_text: sourceText,
        notes: typeof json.notes === "string" ? json.notes : undefined,
        extracted_fields: extractedFields,
        status: "parsed"
      })
      .eq("org_id", auth.context.orgId)
      .eq("id", params.id)
      .select("id, created_at, source_name, document_type, status, extracted_fields, linked_entity_id, notes")
      .single();

    if (updateError || !updated) {
      return fail(400, { code: "PARSE_FAILED", message: updateError?.message ?? "OCR document could not be parsed." });
    }

    return ok(updated);
  } catch (error) {
    return fail(500, { code: "PARSE_FAILED", message: errorMessage(error) });
  }
}
