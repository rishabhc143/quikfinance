import { canWriteData, requireApiContext } from "@/lib/api/auth";
import { errorMessage, fail, ok } from "@/lib/api/responses";
import { extractDocumentFields } from "@/lib/ocr/parser";
import { listEntityAttachments } from "@/lib/storage/attachments";
import { ocrDocumentSchema } from "@/lib/validations/automation.schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiContext();
  if (!auth.ok) {
    return fail(auth.status, { code: auth.code, message: auth.message });
  }

  const { data, error } = await auth.context.supabase
    .from("ocr_documents")
    .select("id, created_at, source_name, document_type, status, extracted_fields, linked_entity_id")
    .eq("org_id", auth.context.orgId)
    .order("created_at", { ascending: false });

  if (error) {
    return fail(500, { code: "OCR_LIST_FAILED", message: error.message });
  }

  const attachments = data?.length
    ? await Promise.all((data ?? []).map(async (row) => ({ id: row.id, attachments: await listEntityAttachments(auth.context.orgId, "ocr_document", String(row.id)).catch(() => []) })))
    : [];
  const attachmentMap = new Map(attachments.map((entry) => [entry.id, entry.attachments]));

  const rows = (data ?? []).map((row) => {
    const extracted = (row.extracted_fields ?? {}) as Record<string, unknown>;
    const rowAttachments = attachmentMap.get(String(row.id)) ?? [];
    return {
      id: row.id,
      created_at: row.created_at,
      source_name: row.source_name,
      document_type: row.document_type,
      vendor_name: typeof extracted.vendor_name === "string" ? extracted.vendor_name : "Unknown vendor",
      total: typeof extracted.total === "number" ? extracted.total : Number(extracted.total ?? 0),
      status: row.status,
      linked_entity_id: row.linked_entity_id,
      attachment_count: rowAttachments.length,
      file_name: rowAttachments[0]?.file_name ?? null
    };
  });

  return ok(rows);
}

export async function POST(request: Request) {
  const auth = await requireApiContext();
  if (!auth.ok) {
    return fail(auth.status, { code: auth.code, message: auth.message });
  }
  if (!canWriteData(auth.context.role)) {
    return fail(403, { code: "READ_ONLY_ROLE", message: "Your role is read-only." });
  }

  try {
    const json = (await request.json()) as Record<string, unknown>;
    const parsed = ocrDocumentSchema.safeParse(json);
    if (!parsed.success) {
      return fail(422, {
        code: "VALIDATION_FAILED",
        message: "The OCR submission is invalid.",
        details: parsed.error.flatten()
      });
    }

    const extractedFields = extractDocumentFields(parsed.data.source_text) as Record<string, unknown>;
    const override =
      typeof json.extracted_fields_override === "object" && json.extracted_fields_override !== null && !Array.isArray(json.extracted_fields_override)
        ? (json.extracted_fields_override as Record<string, unknown>)
        : {};
    const mergedExtractedFields = {
      ...extractedFields,
      ...override
    };
    const { data, error } = await auth.context.supabase
      .from("ocr_documents")
      .insert({
        org_id: auth.context.orgId,
        document_type: parsed.data.document_type,
        source_name: parsed.data.source_name,
        source_text: parsed.data.source_text,
        notes: parsed.data.notes ?? null,
        extracted_fields: mergedExtractedFields,
        status: "parsed",
        created_by: auth.context.userId
      })
      .select("id, created_at, source_name, document_type, status, extracted_fields, linked_entity_id")
      .single();

    if (error) {
      return fail(400, { code: "OCR_CREATE_FAILED", message: error.message });
    }

    await auth.context.supabase.from("audit_logs").insert({
      org_id: auth.context.orgId,
      user_id: auth.context.userId,
      entity_type: "ocr_document",
      entity_id: data.id,
      action: "create",
      new_values: mergedExtractedFields
    });

    return ok(
      {
        ...data,
        vendor_name: mergedExtractedFields.vendor_name,
        total: mergedExtractedFields.total,
        extracted_fields: mergedExtractedFields
      },
      undefined,
      { status: 201 }
    );
  } catch (error) {
    return fail(500, { code: "OCR_FAILED", message: errorMessage(error) });
  }
}
