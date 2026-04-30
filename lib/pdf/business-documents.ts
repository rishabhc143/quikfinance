import type { NextRequest } from "next/server";
import type { ApiContext } from "@/lib/api/auth";
import type { BusinessDocumentPdfData } from "@/components/pdf/BusinessDocumentPdf";

export type BusinessDocumentKind = "bill" | "quotation" | "sales-order" | "purchase-order" | "credit-note" | "vendor-credit";

const documentConfigs: Record<BusinessDocumentKind, {
  apiPath: string;
  title: string;
  numberField: string;
  counterpartField: "customer" | "vendor";
  counterpartLabel: string;
  secondaryDateLabel: string;
  relatedLabel?: string;
}> = {
  bill: {
    apiPath: "bills",
    title: "Bill",
    numberField: "bill_number",
    counterpartField: "vendor",
    counterpartLabel: "Vendor",
    secondaryDateLabel: "Due date"
  },
  quotation: {
    apiPath: "quotations",
    title: "Quotation",
    numberField: "quotation_number",
    counterpartField: "customer",
    counterpartLabel: "Customer",
    secondaryDateLabel: "Expiry date"
  },
  "sales-order": {
    apiPath: "sales-orders",
    title: "Sales Order",
    numberField: "sales_order_number",
    counterpartField: "customer",
    counterpartLabel: "Customer",
    secondaryDateLabel: "Expected date"
  },
  "purchase-order": {
    apiPath: "purchase-orders",
    title: "Purchase Order",
    numberField: "purchase_order_number",
    counterpartField: "vendor",
    counterpartLabel: "Vendor",
    secondaryDateLabel: "Expected date"
  },
  "credit-note": {
    apiPath: "credit-notes",
    title: "Credit Note",
    numberField: "credit_note_number",
    counterpartField: "customer",
    counterpartLabel: "Customer",
    secondaryDateLabel: "Apply by",
    relatedLabel: "Original invoice"
  },
  "vendor-credit": {
    apiPath: "vendor-credits",
    title: "Vendor Credit",
    numberField: "vendor_credit_number",
    counterpartField: "vendor",
    counterpartLabel: "Vendor",
    secondaryDateLabel: "Apply by",
    relatedLabel: "Related bill"
  }
};

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown) {
  return Number(value ?? 0);
}

function formatAddress(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }
  const record = value as Record<string, unknown>;
  return [record.line1, record.line2, record.city, record.state, record.zip, record.country]
    .filter((item) => typeof item === "string" && item.trim().length > 0)
    .map((item) => String(item));
}

export async function loadBusinessDocumentPdfData(request: NextRequest, context: ApiContext, kind: BusinessDocumentKind, id: string) {
  const config = documentConfigs[kind];
  if (!config) {
    throw new Error("Unsupported document kind.");
  }

  const [{ data: organization, error: organizationError }, documentResponse] = await Promise.all([
    context.supabase.from("organizations").select("name, legal_name, gstin, pan, email, address").eq("id", context.orgId).single(),
    fetch(new URL(`/api/v1/${config.apiPath}/${id}`, request.url), {
      headers: { cookie: request.headers.get("cookie") ?? "" },
      cache: "no-store"
    })
  ]);

  if (organizationError || !organization) {
    throw new Error("Organization was not found.");
  }

  const documentJson = (await documentResponse.json().catch(() => ({}))) as { data?: Record<string, unknown>; error?: { message?: string } };
  if (!documentResponse.ok || !documentJson.data) {
    throw new Error(documentJson.error?.message ?? "Document was not found.");
  }

  const record = documentJson.data;
  const lineItems = Array.isArray(record.line_items) ? record.line_items : [];

  const relatedNumber = kind === "credit-note"
    ? asString(record.related_invoice_number)
    : kind === "vendor-credit"
      ? asString(record.related_bill_number)
      : "";

  return {
    documentTitle: config.title,
    documentNumber: asString(record[config.numberField], config.title),
    status: asString(record.status, "draft"),
    issueDate: asString(record.issue_date),
    secondaryDateLabel: config.secondaryDateLabel,
    secondaryDateValue: asString(record.due_date),
    companyName: asString(organization.name),
    companySubtitle: asString(organization.legal_name),
    companyAddress: formatAddress(organization.address),
    companyGstin: asString(organization.gstin),
    companyPan: asString(organization.pan),
    companyEmail: asString(organization.email),
    counterpartLabel: config.counterpartLabel,
    counterpartName: asString(record[config.counterpartField], config.counterpartLabel),
    counterpartEmail: asString(record[`${config.counterpartField}_email`]),
    placeOfSupply: asString(record.place_of_supply),
    subtotal: record.subtotal == null ? undefined : asNumber(record.subtotal),
    discountTotal: record.discount_total == null ? undefined : asNumber(record.discount_total),
    taxTotal: record.tax_total == null ? undefined : asNumber(record.tax_total),
    roundOff: record.round_off == null ? undefined : asNumber(record.round_off),
    total: asNumber(record.total),
    balanceDue: record.balance_due == null ? undefined : asNumber(record.balance_due),
    notes: asString(record.notes),
    terms: asString(record.terms),
    relatedLabel: config.relatedLabel,
    relatedNumber,
    lineItems: lineItems.map((line) => ({
      description: asString((line as Record<string, unknown>).description),
      quantity: asNumber((line as Record<string, unknown>).quantity),
      rate: asNumber((line as Record<string, unknown>).rate),
      discount: asNumber((line as Record<string, unknown>).discount),
      taxAmount: asNumber((line as Record<string, unknown>).tax_amount),
      lineTotal: asNumber((line as Record<string, unknown>).line_total)
    }))
  } satisfies BusinessDocumentPdfData;
}
