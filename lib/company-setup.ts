import type { ApiContext } from "@/lib/api/auth";

type CompanyLike = Record<string, unknown>;

export type SetupChecklistItem = {
  key:
    | "company_profile"
    | "fiscal_year"
    | "gst_settings"
    | "chart_of_accounts"
    | "bank_account"
    | "first_customer"
    | "first_item"
    | "first_invoice";
  label: string;
  done: boolean;
};

export type CompanySetupSnapshot = {
  company: CompanyLike;
  setup_completed: boolean;
  required_missing: string[];
  checklist: SetupChecklistItem[];
  progress_percent: number;
};

function hasText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeBoolean(value: unknown) {
  return value === true || value === "true";
}

function normalizeAddress(value: unknown) {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function computeSetupSnapshot(company: CompanyLike, counts: {
  accounts: number;
  bankAccounts: number;
  customers: number;
  items: number;
  invoices: number;
}): CompanySetupSnapshot {
  const address = normalizeAddress(company.address);
  const gstRegistered = normalizeBoolean(company.gst_registered) || hasText(company.gstin);
  const requiredMissing: string[] = [];

  if (!hasText(company.name)) requiredMissing.push("company_name");
  if (!hasText(company.base_currency)) requiredMissing.push("base_currency");
  if (!hasText(company.country)) requiredMissing.push("country");
  if (!hasText(company.city)) requiredMissing.push("city");
  if (!hasText(company.state_code)) requiredMissing.push("state_code");
  if (!hasNumber(company.fiscal_year_start_month)) requiredMissing.push("fiscal_year_start_month");
  if (!hasText(company.fiscal_year_start_date)) requiredMissing.push("fiscal_year_start_date");
  if (!hasText(company.fiscal_year_end_date)) requiredMissing.push("fiscal_year_end_date");
  if (!hasText(company.invoice_prefix)) requiredMissing.push("invoice_prefix");
  if (!hasNumber(company.invoice_next_number)) requiredMissing.push("invoice_next_number");
  if (gstRegistered && !hasText(company.gstin)) requiredMissing.push("gstin");
  if (gstRegistered && !hasText(company.place_of_supply)) requiredMissing.push("place_of_supply");
  if (!hasText(String(address.line1 ?? "")) && !hasText(company.address_line1)) requiredMissing.push("address");

  const checklist: SetupChecklistItem[] = [
    { key: "company_profile", label: "Add company profile", done: hasText(company.name) && hasText(company.country) && hasText(company.city) && hasText(company.state_code) },
    { key: "fiscal_year", label: "Configure fiscal year", done: hasText(company.fiscal_year_start_date) && hasText(company.fiscal_year_end_date) },
    { key: "gst_settings", label: "Configure GST settings", done: !gstRegistered || (hasText(company.gstin) && hasText(company.place_of_supply)) },
    { key: "chart_of_accounts", label: "Review chart of accounts", done: counts.accounts > 0 },
    { key: "bank_account", label: "Add bank account", done: counts.bankAccounts > 0 },
    { key: "first_customer", label: "Add first customer", done: counts.customers > 0 },
    { key: "first_item", label: "Add first product/service", done: counts.items > 0 },
    { key: "first_invoice", label: "Create first invoice", done: counts.invoices > 0 }
  ];

  const completed = checklist.filter((item) => item.done).length;
  const setupCompleted = requiredMissing.length === 0 && completed >= 4;

  return {
    company,
    setup_completed: setupCompleted,
    required_missing: requiredMissing,
    checklist,
    progress_percent: Math.round((completed / checklist.length) * 100)
  };
}

export async function loadCompanySetupSnapshot(context: ApiContext): Promise<CompanySetupSnapshot> {
  const [companyResult, accountsResult, bankAccountsResult, customersResult, itemsResult, invoicesResult] = await Promise.all([
    context.supabase.from("organizations").select("*").eq("id", context.orgId).single(),
    context.supabase.from("accounts").select("id", { count: "exact", head: true }).eq("org_id", context.orgId),
    context.supabase.from("bank_accounts").select("id", { count: "exact", head: true }).eq("org_id", context.orgId),
    context.supabase.from("contacts").select("id", { count: "exact", head: true }).eq("org_id", context.orgId).eq("type", "customer"),
    context.supabase.from("items").select("id", { count: "exact", head: true }).eq("org_id", context.orgId),
    context.supabase.from("invoices").select("id", { count: "exact", head: true }).eq("org_id", context.orgId)
  ]);

  if (companyResult.error || !companyResult.data) {
    throw new Error(companyResult.error?.message ?? "Company profile was not found.");
  }

  return computeSetupSnapshot(companyResult.data as CompanyLike, {
    accounts: accountsResult.count ?? 0,
    bankAccounts: bankAccountsResult.count ?? 0,
    customers: customersResult.count ?? 0,
    items: itemsResult.count ?? 0,
    invoices: invoicesResult.count ?? 0
  });
}
