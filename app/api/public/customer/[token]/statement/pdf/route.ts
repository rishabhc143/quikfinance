import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { fail } from "@/lib/api/responses";
import { TabularPdfDocument } from "@/components/pdf/TabularPdfDocument";
import { getCustomerPortalPayload } from "@/lib/portals";
import { formatPdfDate, formatPdfMoney, formatPdfSlug } from "@/lib/pdf/format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: { token: string } }) {
  const payload = await getCustomerPortalPayload(params.token);
  if (!payload) {
    return fail(404, { code: "PORTAL_NOT_FOUND", message: "Portal link is invalid or expired." });
  }

  const outstanding = payload.invoices.reduce((sum, invoice) => sum + Number(invoice.balance_due ?? 0), 0);
  const exportPayload = {
    title: `${payload.customer?.display_name ?? "Customer"} Statement`,
    subtitle: `Outstanding statement for ${payload.organization?.name ?? "QuikFinance"}`,
    filenameBase: `customer-statement-${payload.customer?.display_name ?? "statement"}`,
    orientation: "portrait" as const,
    summary: [
      { label: "Open invoices", value: String(payload.invoices.length) },
      { label: "Outstanding", value: formatPdfMoney(outstanding) },
      { label: "Generated on", value: formatPdfDate(new Date().toISOString()) }
    ],
    columns: [
      { key: "invoice_number", label: "Invoice" },
      { key: "issue_date", label: "Issue date", kind: "date" as const },
      { key: "due_date", label: "Due date", kind: "date" as const },
      { key: "total", label: "Total", kind: "money" as const },
      { key: "balance_due", label: "Balance due", kind: "money" as const },
      { key: "status", label: "Status" }
    ],
    rows: payload.invoices
  };

  const document = React.createElement(TabularPdfDocument, { payload: exportPayload }) as Parameters<typeof renderToBuffer>[0];
  const buffer = await renderToBuffer(document);
  const filename = `${formatPdfSlug(exportPayload.filenameBase)}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
