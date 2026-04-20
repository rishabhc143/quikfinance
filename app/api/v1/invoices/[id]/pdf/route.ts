import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import type { NextRequest } from "next/server";
import { InvoicePDFTemplate } from "@/components/invoice/InvoicePDFTemplate";
import { requireApiContext } from "@/lib/api/auth";
import { fail } from "@/lib/api/responses";
import { pdfFileName } from "@/lib/utils/pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) {
    return fail(auth.status, { code: auth.code, message: auth.message });
  }

  const { data, error } = await auth.context.supabase
    .from("invoices")
    .select("invoice_number, issue_date, due_date, subtotal, tax_total, total")
    .eq("org_id", auth.context.orgId)
    .eq("id", params.id)
    .single();

  if (error || !data) {
    return fail(404, { code: "NOT_FOUND", message: "Invoice was not found." });
  }

  const document = React.createElement(InvoicePDFTemplate, {
    invoice: {
      invoiceNumber: data.invoice_number,
      customerName: "Customer",
      issueDate: data.issue_date,
      dueDate: data.due_date,
      subtotal: data.subtotal,
      taxTotal: data.tax_total,
      total: data.total
    }
  }) as Parameters<typeof renderToBuffer>[0];
  const buffer = await renderToBuffer(document);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${pdfFileName("invoice", data.invoice_number)}"`
    }
  });
}
