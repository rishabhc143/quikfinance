import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import type { NextRequest } from "next/server";
import { InvoicePDFTemplate } from "@/components/invoice/InvoicePDFTemplate";
import { requireApiContext } from "@/lib/api/auth";
import { fail } from "@/lib/api/responses";
import { loadInvoicePdfData } from "@/lib/invoice-pdf";
import { pdfFileName } from "@/lib/utils/pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) {
    return fail(auth.status, { code: auth.code, message: auth.message });
  }

  let invoice;
  try {
    invoice = await loadInvoicePdfData(auth.context.supabase as never, auth.context.orgId, params.id);
  } catch {
    return fail(404, { code: "NOT_FOUND", message: "Invoice was not found." });
  }

  const document = React.createElement(InvoicePDFTemplate, {
    invoice
  }) as Parameters<typeof renderToBuffer>[0];
  const buffer = await renderToBuffer(document);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${pdfFileName("invoice", invoice.invoiceNumber)}"`
    }
  });
}
