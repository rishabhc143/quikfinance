import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import type { NextRequest } from "next/server";
import { requireApiContext } from "@/lib/api/auth";
import { fail } from "@/lib/api/responses";
import { BusinessDocumentPdf } from "@/components/pdf/BusinessDocumentPdf";
import { loadBusinessDocumentPdfData, type BusinessDocumentKind } from "@/lib/pdf/business-documents";
import { pdfFileName } from "@/lib/utils/pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isBusinessDocumentKind(value: string): value is BusinessDocumentKind {
  return ["bill", "quotation", "sales-order", "purchase-order", "credit-note", "vendor-credit"].includes(value);
}

export async function GET(request: NextRequest, { params }: { params: { kind: string; id: string } }) {
  if (!isBusinessDocumentKind(params.kind)) {
    return fail(404, { code: "NOT_FOUND", message: "Document type is not supported." });
  }

  const auth = await requireApiContext();
  if (!auth.ok) {
    return fail(auth.status, { code: auth.code, message: auth.message });
  }

  let documentData;
  try {
    documentData = await loadBusinessDocumentPdfData(request, auth.context, params.kind, params.id);
  } catch (error) {
    return fail(404, { code: "NOT_FOUND", message: error instanceof Error ? error.message : "Document was not found." });
  }

  const document = React.createElement(BusinessDocumentPdf, {
    document: documentData
  }) as Parameters<typeof renderToBuffer>[0];
  const buffer = await renderToBuffer(document);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${pdfFileName(params.kind, documentData.documentNumber)}"`
    }
  });
}
