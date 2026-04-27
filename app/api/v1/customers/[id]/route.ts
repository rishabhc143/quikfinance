import { createCrudItemHandlers } from "@/lib/api/crud";
import { requireApiContext } from "@/lib/api/auth";
import { fail, ok } from "@/lib/api/responses";
import { customerRouteConfig } from "@/lib/api/module-routes";

export const dynamic = "force-dynamic";

const handlers = createCrudItemHandlers(customerRouteConfig);

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) {
    return fail(auth.status, { code: auth.code, message: auth.message });
  }

  const [{ data: contact, error: contactError }, { data: invoices }, { data: payments }] = await Promise.all([
    auth.context.supabase
      .from("contacts")
      .select("id, display_name, email, phone, tax_id, state_code, payment_terms, opening_balance, currency")
      .eq("org_id", auth.context.orgId)
      .eq("type", "customer")
      .eq("id", params.id)
      .single(),
    auth.context.supabase
      .from("invoices")
      .select("id, invoice_number, issue_date, due_date, total, balance_due, status")
      .eq("org_id", auth.context.orgId)
      .eq("contact_id", params.id)
      .order("issue_date", { ascending: false })
      .limit(8),
    auth.context.supabase
      .from("payments")
      .select("id, payment_date, amount, method, reference, status")
      .eq("org_id", auth.context.orgId)
      .eq("contact_id", params.id)
      .eq("payment_type", "received")
      .order("payment_date", { ascending: false })
      .limit(8)
  ]);

  if (contactError || !contact) {
    return fail(404, { code: "NOT_FOUND", message: "Customer was not found." });
  }

  const today = new Date().toISOString().slice(0, 10);
  const documents =
    (invoices ?? []).map((invoice) => ({
      id: String(invoice.id),
      number: String(invoice.invoice_number),
      issue_date: String(invoice.issue_date),
      due_date: String(invoice.due_date),
      total: Number(invoice.total ?? 0),
      balance_due: Number(invoice.balance_due ?? 0),
      status: String(invoice.status ?? "")
    })) ?? [];
  const paymentRows =
    (payments ?? []).map((payment) => ({
      id: String(payment.id),
      payment_date: String(payment.payment_date),
      amount: Number(payment.amount ?? 0),
      method: String(payment.method ?? ""),
      reference: typeof payment.reference === "string" ? payment.reference : null,
      status: String(payment.status ?? "")
    })) ?? [];

  return ok({
    ...contact,
    summary: {
      outstanding: documents.reduce((sum, document) => sum + document.balance_due, 0),
      overdue: documents.filter((document) => document.balance_due > 0 && document.due_date < today).reduce((sum, document) => sum + document.balance_due, 0),
      open_documents: documents.filter((document) => document.balance_due > 0).length,
      posted_payments: paymentRows.filter((payment) => payment.status === "posted").length
    },
    documents,
    payments: paymentRows
  });
}

export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
