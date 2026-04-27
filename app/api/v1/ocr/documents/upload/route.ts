import { canWriteData, requireApiContext } from "@/lib/api/auth";
import { errorMessage, fail, ok } from "@/lib/api/responses";
import { uploadEntityAttachment, signAttachmentUrls } from "@/lib/storage/attachments";

export const dynamic = "force-dynamic";

function asString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
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
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size <= 0) {
      return fail(422, { code: "FILE_REQUIRED", message: "Choose a file to upload." });
    }

    const sourceName = asString(formData.get("source_name")) || file.name;
    const sourceText = asString(formData.get("source_text"));
    const notes = asString(formData.get("notes")) || null;
    const documentType = asString(formData.get("document_type")) === "invoice" ? "invoice" : "bill";

    const { data: document, error } = await auth.context.supabase
      .from("ocr_documents")
      .insert({
        org_id: auth.context.orgId,
        document_type: documentType,
        source_name: sourceName,
        source_text: sourceText,
        notes,
        status: "uploaded",
        extracted_fields: {
          file_name: file.name,
          content_type: file.type || "application/octet-stream",
          size_bytes: file.size
        },
        created_by: auth.context.userId
      })
      .select("id, created_at, source_name, document_type, status, extracted_fields, linked_entity_id, notes")
      .single();

    if (error || !document) {
      return fail(400, { code: "OCR_CREATE_FAILED", message: error?.message ?? "OCR document could not be created." });
    }

    const attachment = await uploadEntityAttachment({
      orgId: auth.context.orgId,
      entityType: "ocr_document",
      entityId: String(document.id),
      uploadedBy: auth.context.userId,
      scope: "ocr",
      file
    });

    await auth.context.supabase.from("audit_logs").insert({
      org_id: auth.context.orgId,
      user_id: auth.context.userId,
      entity_type: "ocr_document",
      entity_id: document.id,
      action: "upload",
      new_values: {
        file_name: file.name,
        size_bytes: file.size,
        content_type: file.type
      }
    });

    return ok(
      {
        ...document,
        attachments: await signAttachmentUrls([attachment])
      },
      undefined,
      { status: 201 }
    );
  } catch (error) {
    return fail(500, { code: "OCR_UPLOAD_FAILED", message: errorMessage(error) });
  }
}
