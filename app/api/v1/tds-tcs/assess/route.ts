import { NextRequest } from "next/server";
import { canManageCompliance, requireApiContext } from "@/lib/api/auth";
import { fail, ok } from "@/lib/api/responses";
import type { Json } from "@/types/database.types";

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });
  if (!canManageCompliance(auth.context.role)) {
    return fail(403, { code: "INSUFFICIENT_ROLE", message: "Only owners, admins, and accountants can assess TDS/TCS records." });
  }

  const body = await request.json().catch(() => ({}));
  const transactionType = typeof body.transaction_type === "string" ? body.transaction_type : "";
  const transactionId = typeof body.transaction_id === "string" ? body.transaction_id : "";
  if (!transactionType || !transactionId) {
    return fail(422, { code: "VALIDATION_FAILED", message: "Transaction type and transaction are required." });
  }

  const { data: existing } = await auth.context.supabase
    .from("tds_tcs_records")
    .select("id")
    .eq("org_id", auth.context.orgId)
    .eq("transaction_type", transactionType)
    .eq("transaction_id", transactionId)
    .maybeSingle();
  if (existing?.id) {
    return fail(409, { code: "ALREADY_EXISTS", message: "A TDS/TCS record already exists for this transaction." });
  }

  let payload: Record<string, unknown> | null = null;

  if (transactionType === "bill") {
    const { data: bill, error } = await auth.context.supabase
      .from("bills")
      .select("id, contact_id, bill_number, total, issue_date")
      .eq("org_id", auth.context.orgId)
      .eq("id", transactionId)
      .single();
    if (error || !bill) return fail(404, { code: "BILL_NOT_FOUND", message: "Bill was not found." });
    const rate = Number(body.tax_rate ?? 1);
    payload = {
      org_id: auth.context.orgId,
      section_code: typeof body.section_code === "string" ? body.section_code : "194C",
      tax_kind: "tds",
      transaction_type: "bill",
      transaction_id: String(bill.id),
      party_type: "vendor",
      party_id: bill.contact_id,
      assessment_date: String(bill.issue_date),
      base_amount: Number(bill.total ?? 0),
      tax_rate: rate,
      tax_amount: roundMoney(Number(bill.total ?? 0) * rate / 100),
      status: "review",
      notes: typeof body.notes === "string" ? body.notes : `Auto-assessed from bill ${String(bill.bill_number ?? "")}`,
      created_by: auth.context.userId
    };
  } else if (transactionType === "invoice") {
    const { data: invoice, error } = await auth.context.supabase
      .from("invoices")
      .select("id, contact_id, invoice_number, total, issue_date")
      .eq("org_id", auth.context.orgId)
      .eq("id", transactionId)
      .single();
    if (error || !invoice) return fail(404, { code: "INVOICE_NOT_FOUND", message: "Invoice was not found." });
    const rate = Number(body.tax_rate ?? 0.1);
    payload = {
      org_id: auth.context.orgId,
      section_code: typeof body.section_code === "string" ? body.section_code : "206C",
      tax_kind: "tcs",
      transaction_type: "invoice",
      transaction_id: String(invoice.id),
      party_type: "customer",
      party_id: invoice.contact_id,
      assessment_date: String(invoice.issue_date),
      base_amount: Number(invoice.total ?? 0),
      tax_rate: rate,
      tax_amount: roundMoney(Number(invoice.total ?? 0) * rate / 100),
      status: "review",
      notes: typeof body.notes === "string" ? body.notes : `Auto-assessed from invoice ${String(invoice.invoice_number ?? "")}`,
      created_by: auth.context.userId
    };
  } else {
    return fail(422, { code: "UNSUPPORTED_TRANSACTION", message: "Only bill and invoice assessments are automated in this flow." });
  }

  const { data, error } = await auth.context.supabase.from("tds_tcs_records").insert(payload).select("*").single();
  if (error) {
    return fail(400, { code: "CREATE_FAILED", message: error.message });
  }

  await auth.context.supabase.from("audit_logs").insert({
    org_id: auth.context.orgId,
    user_id: auth.context.userId,
    action: "assess",
    entity_type: "tds_tcs_record",
    entity_id: String((data as { id?: string }).id ?? ""),
    new_values: payload as Json
  });

  return ok(data, undefined, { status: 201 });
}
