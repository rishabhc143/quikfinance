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

function deriveFiscalDates(startMonth: number | null | undefined) {
  const month = typeof startMonth === "number" && startMonth >= 1 && startMonth <= 12 ? startMonth : 4;
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;
  const startYear = currentMonth >= month ? currentYear : currentYear - 1;
  const start = `${startYear}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(Date.UTC(startYear + 1, month - 1, 0));
  const end = `${endDate.getUTCFullYear()}-${String(endDate.getUTCMonth() + 1).padStart(2, "0")}-${String(endDate.getUTCDate()).padStart(2, "0")}`;
  return { start, end };
}

function normalizeCompany(company: CompanyLike): CompanyLike {
  const address = normalizeAddress(company.address);
  const meta = typeof address._meta === "object" && address._meta !== null && !Array.isArray(address._meta) ? (address._meta as Record<string, unknown>) : {};
  const fiscalYearStartMonth =
    typeof company.fiscal_year_start_month === "number"
      ? company.fiscal_year_start_month
      : typeof company.fiscal_year_start === "number"
        ? company.fiscal_year_start
        : typeof meta.fiscal_year_start_month === "number"
          ? meta.fiscal_year_start_month
          : 4;
  const derivedDates = deriveFiscalDates(fiscalYearStartMonth);

  return {
    ...company,
    address_line1: typeof company.address_line1 === "string" ? company.address_line1 : typeof address.line1 === "string" ? address.line1 : null,
    address_line2: typeof company.address_line2 === "string" ? company.address_line2 : typeof address.line2 === "string" ? address.line2 : null,
    city: typeof company.city === "string" ? company.city : typeof address.city === "string" ? address.city : null,
    state_code: typeof company.state_code === "string" ? company.state_code : typeof address.state_code === "string" ? address.state_code : null,
    country: typeof company.country === "string" ? company.country : typeof address.country === "string" ? address.country : null,
    pin_code: typeof company.pin_code === "string" ? company.pin_code : typeof address.pin_code === "string" ? address.pin_code : null,
    website: typeof company.website === "string" ? company.website : typeof meta.website === "string" ? meta.website : null,
    business_type: typeof company.business_type === "string" ? company.business_type : typeof meta.business_type === "string" ? meta.business_type : null,
    industry: typeof company.industry === "string" ? company.industry : typeof meta.industry === "string" ? meta.industry : null,
    gst_registered:
      typeof company.gst_registered === "boolean"
        ? company.gst_registered
        : typeof meta.gst_registered === "boolean"
          ? meta.gst_registered
          : hasText(company.gstin),
    gst_filing_frequency:
      typeof company.gst_filing_frequency === "string"
        ? company.gst_filing_frequency
        : typeof meta.gst_filing_frequency === "string"
          ? meta.gst_filing_frequency
          : "monthly",
    place_of_supply:
      typeof company.place_of_supply === "string"
        ? company.place_of_supply
        : typeof meta.place_of_supply === "string"
          ? meta.place_of_supply
          : company.state_code ?? null,
    fiscal_year_start_month: fiscalYearStartMonth,
    fiscal_year_start_date:
      typeof company.fiscal_year_start_date === "string"
        ? company.fiscal_year_start_date
        : typeof meta.fiscal_year_start_date === "string"
          ? meta.fiscal_year_start_date
          : derivedDates.start,
    fiscal_year_end_date:
      typeof company.fiscal_year_end_date === "string"
        ? company.fiscal_year_end_date
        : typeof meta.fiscal_year_end_date === "string"
          ? meta.fiscal_year_end_date
          : derivedDates.end,
    accounting_method:
      typeof company.accounting_method === "string"
        ? company.accounting_method
        : typeof meta.accounting_method === "string"
          ? meta.accounting_method
          : "accrual",
    invoice_next_number:
      typeof company.invoice_next_number === "number"
        ? company.invoice_next_number
        : typeof meta.invoice_next_number === "number"
          ? meta.invoice_next_number
          : 1,
    payment_terms:
      typeof company.payment_terms === "string"
        ? company.payment_terms
        : typeof meta.payment_terms === "string"
          ? meta.payment_terms
          : "Net 30"
  };
}

export function computeSetupSnapshot(company: CompanyLike, counts: {
  accounts: number;
  bankAccounts: number;
  customers: number;
  items: number;
  invoices: number;
}): CompanySetupSnapshot {
  const normalizedCompany = normalizeCompany(company);
  const address = normalizeAddress(normalizedCompany.address);
  const gstRegistered = normalizeBoolean(normalizedCompany.gst_registered) || hasText(normalizedCompany.gstin);
  const requiredMissing: string[] = [];

  if (!hasText(normalizedCompany.name)) requiredMissing.push("company_name");
  if (!hasText(normalizedCompany.base_currency)) requiredMissing.push("base_currency");
  if (!hasText(normalizedCompany.country)) requiredMissing.push("country");
  if (!hasText(normalizedCompany.city)) requiredMissing.push("city");
  if (!hasText(normalizedCompany.state_code)) requiredMissing.push("state_code");
  if (!hasNumber(normalizedCompany.fiscal_year_start_month)) requiredMissing.push("fiscal_year_start_month");
  if (!hasText(normalizedCompany.fiscal_year_start_date)) requiredMissing.push("fiscal_year_start_date");
  if (!hasText(normalizedCompany.fiscal_year_end_date)) requiredMissing.push("fiscal_year_end_date");
  if (!hasText(normalizedCompany.invoice_prefix)) requiredMissing.push("invoice_prefix");
  if (!hasNumber(normalizedCompany.invoice_next_number)) requiredMissing.push("invoice_next_number");
  if (gstRegistered && !hasText(normalizedCompany.gstin)) requiredMissing.push("gstin");
  if (gstRegistered && !hasText(normalizedCompany.place_of_supply)) requiredMissing.push("place_of_supply");
  if (!hasText(String(address.line1 ?? "")) && !hasText(normalizedCompany.address_line1)) requiredMissing.push("address");

  const checklist: SetupChecklistItem[] = [
    { key: "company_profile", label: "Add company profile", done: hasText(normalizedCompany.name) && hasText(normalizedCompany.country) && hasText(normalizedCompany.city) && hasText(normalizedCompany.state_code) },
    { key: "fiscal_year", label: "Configure fiscal year", done: hasText(normalizedCompany.fiscal_year_start_date) && hasText(normalizedCompany.fiscal_year_end_date) },
    { key: "gst_settings", label: "Configure GST settings", done: !gstRegistered || (hasText(normalizedCompany.gstin) && hasText(normalizedCompany.place_of_supply)) },
    { key: "chart_of_accounts", label: "Review chart of accounts", done: counts.accounts > 0 },
    { key: "bank_account", label: "Add bank account", done: counts.bankAccounts > 0 },
    { key: "first_customer", label: "Add first customer", done: counts.customers > 0 },
    { key: "first_item", label: "Add first product/service", done: counts.items > 0 },
    { key: "first_invoice", label: "Create first invoice", done: counts.invoices > 0 }
  ];

  const completed = checklist.filter((item) => item.done).length;
  const setupCompleted = requiredMissing.length === 0 && completed >= 4;

  return {
    company: normalizedCompany,
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
