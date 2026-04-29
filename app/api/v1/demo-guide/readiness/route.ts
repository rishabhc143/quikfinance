import { requireApiContext } from "@/lib/api/auth";
import { fail, ok } from "@/lib/api/responses";
import { loadCompanySetupSnapshot } from "@/lib/company-setup";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiContext();
  if (!auth.ok) {
    return fail(auth.status, { code: auth.code, message: auth.message });
  }

  const [setup, customerCount, vendorCount, itemCount, bankCount, invoiceCount, billCount, expenseCount] = await Promise.all([
    loadCompanySetupSnapshot(auth.context),
    auth.context.supabase.from("contacts").select("id", { count: "exact", head: true }).eq("org_id", auth.context.orgId).eq("contact_type", "customer"),
    auth.context.supabase.from("contacts").select("id", { count: "exact", head: true }).eq("org_id", auth.context.orgId).eq("contact_type", "vendor"),
    auth.context.supabase.from("items").select("id", { count: "exact", head: true }).eq("org_id", auth.context.orgId),
    auth.context.supabase.from("bank_accounts").select("id", { count: "exact", head: true }).eq("org_id", auth.context.orgId),
    auth.context.supabase.from("invoices").select("id", { count: "exact", head: true }).eq("org_id", auth.context.orgId),
    auth.context.supabase.from("bills").select("id", { count: "exact", head: true }).eq("org_id", auth.context.orgId),
    auth.context.supabase.from("expenses").select("id", { count: "exact", head: true }).eq("org_id", auth.context.orgId)
  ]);

  const checks = [
    { key: "setup", label: "Company setup complete", done: setup.setup_completed, route: "/company-setup" },
    { key: "customers", label: "At least one customer", done: (customerCount.count ?? 0) > 0, route: "/customers/new" },
    { key: "vendors", label: "At least one vendor", done: (vendorCount.count ?? 0) > 0, route: "/vendors/new" },
    { key: "items", label: "At least one item", done: (itemCount.count ?? 0) > 0, route: "/inventory/new" },
    { key: "bank_accounts", label: "At least one bank account", done: (bankCount.count ?? 0) > 0, route: "/bank-accounts/new" },
    { key: "invoices", label: "Sample invoice exists", done: (invoiceCount.count ?? 0) > 0, route: "/invoices/new" },
    { key: "bills", label: "Sample bill exists", done: (billCount.count ?? 0) > 0, route: "/bills/new" },
    { key: "expenses", label: "Sample expense exists", done: (expenseCount.count ?? 0) > 0, route: "/expenses/new" }
  ];

  return ok({
    readiness_score: checks.filter((item) => item.done).length,
    readiness_total: checks.length,
    checks
  });
}
