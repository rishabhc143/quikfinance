import { canWriteData, requireApiContext } from "@/lib/api/auth";
import { errorMessage, fail, ok } from "@/lib/api/responses";
import { resolveWorkflowExceptions, upsertWorkflowException } from "@/lib/compliance/exceptions";
import { extractDocumentFields } from "@/lib/ocr/parser";

export const dynamic = "force-dynamic";

async function parseJson(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
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
      .select("id, document_type, source_name, source_text, extracted_fields")
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

    const parsedFields = extractDocumentFields(sourceText);
    const warnings = [...parsedFields.warnings];
    const invoiceNumber = normalizeText(parsedFields.invoice_number);
    const vendorName = normalizeText(parsedFields.vendor_name);
    const total = Number(parsedFields.total ?? 0);

    if (invoiceNumber) {
      const [{ data: bills }, { data: ocrDocuments }] = await Promise.all([
        auth.context.supabase
          .from("bills")
          .select("id, bill_number, total")
          .eq("org_id", auth.context.orgId)
          .eq("bill_number", parsedFields.invoice_number ?? ""),
        auth.context.supabase
          .from("ocr_documents")
          .select("id, source_name, extracted_fields, linked_entity_id")
          .eq("org_id", auth.context.orgId)
          .neq("id", params.id)
          .eq("document_type", document.document_type)
      ]);

      const duplicateBills = (bills ?? []).filter((bill) => Math.abs(Number(bill.total ?? 0) - total) <= 1);
      const duplicateOcr = (ocrDocuments ?? []).filter((entry) => {
        const extracted = (entry.extracted_fields ?? {}) as Record<string, unknown>;
        const candidateInvoice = normalizeText(extracted.invoice_number ?? extracted.bill_number);
        const candidateVendor = normalizeText(extracted.vendor_name ?? entry.source_name);
        const candidateTotal = Number(extracted.total ?? 0);
        if (candidateInvoice !== invoiceNumber) {
          return false;
        }
        if (vendorName && candidateVendor && candidateVendor !== vendorName) {
          return false;
        }
        return Math.abs(candidateTotal - total) <= 1;
      });

      if (duplicateBills.length > 0 || duplicateOcr.length > 0) {
        warnings.push("Possible duplicate detected against existing OCR documents or posted bills.");
      }
    }

    const extractedFields = {
      ...(typeof document.extracted_fields === "object" && document.extracted_fields ? document.extracted_fields : {}),
      ...parsedFields,
      warnings: Array.from(new Set(warnings))
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

    const warningList: string[] = Array.isArray(extractedFields.warnings) ? extractedFields.warnings.map((warning: unknown) => String(warning)) : [];
    if (warningList.some((warning) => warning.toLowerCase().includes("duplicate"))) {
      await upsertWorkflowException(auth.context, {
        category: "ocr",
        severity: "high",
        title: "Possible duplicate OCR bill",
        description: `${updated.source_name} matches an existing bill or OCR document and needs review before conversion.`,
        entityType: "ocr_document_duplicate",
        entityId: String(updated.id)
      });
    } else {
      await resolveWorkflowExceptions(auth.context, {
        entityType: "ocr_document_duplicate",
        entityId: String(updated.id),
        resolution: "Duplicate signals cleared after OCR re-parse."
      });
    }

    if (Number(extractedFields.confidence_score ?? 0) < 70 || warningList.length > 0) {
      await upsertWorkflowException(auth.context, {
        category: "ocr",
        severity: Number(extractedFields.confidence_score ?? 0) < 55 ? "high" : "medium",
        title: "OCR review required",
        description: `${updated.source_name} needs manual review before draft bill creation.`,
        entityType: "ocr_document_review",
        entityId: String(updated.id)
      });
    } else {
      await resolveWorkflowExceptions(auth.context, {
        entityType: "ocr_document_review",
        entityId: String(updated.id),
        resolution: "OCR confidence and extracted values are acceptable."
      });
    }

    return ok(updated);
  } catch (error) {
    return fail(500, { code: "PARSE_FAILED", message: errorMessage(error) });
  }
}

