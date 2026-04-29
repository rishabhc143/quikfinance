import { requireApiContext, type ApiContext } from "@/lib/api/auth";
import { fail, ok } from "@/lib/api/responses";
import { moduleConfigs, navigationGroups } from "@/lib/modules";
import { workflowPages } from "@/lib/workflow-pages";
import { getEntityHref } from "@/lib/workspace-links";

export const dynamic = "force-dynamic";

type SearchGroup = {
  key: string;
  label: string;
  items: SearchItem[];
};

type SearchItem = {
  id: string;
  kind: "record" | "navigation" | "module" | "workflow";
  group: string;
  title: string;
  description: string;
  href: string;
  entity_type?: string;
  entity_id?: string;
  meta?: string;
};

function filterStaticEntries(query: string) {
  const lowered = query.toLowerCase();

  const navEntries: SearchItem[] = navigationGroups.flatMap((group) =>
    group.items.map((item) => ({
      id: `nav:${item.href}`,
      kind: "navigation" as const,
      group: "Navigation",
      title: item.title,
      description: `Open ${item.title} in ${group.label}.`,
      href: item.href,
      meta: group.label
    }))
  );

  const moduleEntries: SearchItem[] = Object.values(moduleConfigs).map((module) => ({
    id: `module:${module.key}`,
    kind: "module" as const,
    group: "Modules",
    title: module.title,
    description: module.description,
    href: module.newPath ?? `/${module.key}`,
    meta: module.entityName
  }));

  const workflowEntries: SearchItem[] = Object.entries(workflowPages).map(([key, workflow]) => ({
    id: `workflow:${key}`,
    kind: "workflow" as const,
    group: "Workflows",
    title: workflow.title,
    description: workflow.description,
    href: `/${key}`,
    meta: "Workflow"
  }));

  return [...navEntries, ...moduleEntries, ...workflowEntries]
    .filter((item, index, list) => list.findIndex((candidate) => candidate.title === item.title && candidate.href === item.href) === index)
    .filter((item) => !query || `${item.title} ${item.description} ${item.meta ?? ""}`.toLowerCase().includes(lowered))
    .slice(0, query ? 12 : 18);
}

async function searchCustomers(context: ApiContext, query: string) {
  const { data } = await context.supabase
    .from("contacts")
    .select("id, display_name, company_name, email")
    .eq("org_id", context.orgId)
    .eq("contact_type", "customer")
    .or(`display_name.ilike.%${query}%,company_name.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(5);

  return (data ?? []).map((row) => ({
    id: `customer:${row.id}`,
    kind: "record" as const,
    group: "Customers",
    title: String(row.display_name ?? row.company_name ?? "Customer"),
    description: String(row.email ?? row.company_name ?? "Customer record"),
    href: `/customers/${row.id}`,
    entity_type: "customer",
    entity_id: String(row.id),
    meta: "Customer"
  }));
}

async function searchVendors(context: ApiContext, query: string) {
  const { data } = await context.supabase
    .from("contacts")
    .select("id, display_name, company_name, email")
    .eq("org_id", context.orgId)
    .eq("contact_type", "vendor")
    .or(`display_name.ilike.%${query}%,company_name.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(5);

  return (data ?? []).map((row) => ({
    id: `vendor:${row.id}`,
    kind: "record" as const,
    group: "Vendors",
    title: String(row.display_name ?? row.company_name ?? "Vendor"),
    description: String(row.email ?? row.company_name ?? "Vendor record"),
    href: `/vendors/${row.id}`,
    entity_type: "vendor",
    entity_id: String(row.id),
    meta: "Vendor"
  }));
}

async function searchInvoices(context: ApiContext, query: string) {
  const { data } = await context.supabase
    .from("invoices")
    .select("id, invoice_number, status, total, balance_due")
    .eq("org_id", context.orgId)
    .or(`invoice_number.ilike.%${query}%,status.ilike.%${query}%`)
    .limit(5);

  return (data ?? []).map((row) => ({
    id: `invoice:${row.id}`,
    kind: "record" as const,
    group: "Invoices",
    title: String(row.invoice_number ?? "Invoice"),
    description: `Status: ${String(row.status ?? "unknown")} · Total: ${Number(row.total ?? 0).toLocaleString("en-IN")} · Balance: ${Number(row.balance_due ?? 0).toLocaleString("en-IN")}`,
    href: `/invoices/${row.id}`,
    entity_type: "invoice",
    entity_id: String(row.id),
    meta: "Invoice"
  }));
}

async function searchBills(context: ApiContext, query: string) {
  const { data } = await context.supabase
    .from("bills")
    .select("id, bill_number, status, total, balance_due")
    .eq("org_id", context.orgId)
    .or(`bill_number.ilike.%${query}%,status.ilike.%${query}%`)
    .limit(5);

  return (data ?? []).map((row) => ({
    id: `bill:${row.id}`,
    kind: "record" as const,
    group: "Bills",
    title: String(row.bill_number ?? "Bill"),
    description: `Status: ${String(row.status ?? "unknown")} · Total: ${Number(row.total ?? 0).toLocaleString("en-IN")} · Balance: ${Number(row.balance_due ?? 0).toLocaleString("en-IN")}`,
    href: `/bills/${row.id}`,
    entity_type: "bill",
    entity_id: String(row.id),
    meta: "Bill"
  }));
}

async function searchPayments(context: ApiContext, query: string) {
  const { data } = await context.supabase
    .from("payments")
    .select("id, payment_type, payment_date, amount, reference, method, status")
    .eq("org_id", context.orgId)
    .or(`reference.ilike.%${query}%,method.ilike.%${query}%,status.ilike.%${query}%`)
    .limit(5);

  return (data ?? []).map((row) => ({
    id: `payment:${row.id}`,
    kind: "record" as const,
    group: "Payments",
    title: String(row.reference ?? `${row.payment_type} payment`),
    description: `${String(row.payment_type ?? "payment")} · ${Number(row.amount ?? 0).toLocaleString("en-IN")} · ${String(row.method ?? "method")} · ${String(row.status ?? "status")}`,
    href: "/payments",
    entity_type: "payment",
    entity_id: String(row.id),
    meta: row.payment_date ? new Date(String(row.payment_date)).toLocaleDateString("en-IN") : "Payment"
  }));
}

async function searchBankAccounts(context: ApiContext, query: string) {
  const { data } = await context.supabase
    .from("bank_accounts")
    .select("id, name, institution_name, currency, current_balance")
    .eq("org_id", context.orgId)
    .or(`name.ilike.%${query}%,institution_name.ilike.%${query}%,currency.ilike.%${query}%`)
    .limit(5);

  return (data ?? []).map((row) => ({
    id: `bank:${row.id}`,
    kind: "record" as const,
    group: "Bank Accounts",
    title: String(row.name ?? "Bank account"),
    description: `${String(row.institution_name ?? "Institution")} · ${String(row.currency ?? "")} ${Number(row.current_balance ?? 0).toLocaleString("en-IN")}`,
    href: `/bank-accounts/${row.id}`,
    entity_type: "bank_account",
    entity_id: String(row.id),
    meta: "Bank"
  }));
}

async function searchProjects(context: ApiContext, query: string) {
  const { data } = await context.supabase
    .from("projects")
    .select("id, name, status, budget_amount")
    .eq("org_id", context.orgId)
    .or(`name.ilike.%${query}%,status.ilike.%${query}%`)
    .limit(5);

  return (data ?? []).map((row) => ({
    id: `project:${row.id}`,
    kind: "record" as const,
    group: "Projects",
    title: String(row.name ?? "Project"),
    description: `Status: ${String(row.status ?? "unknown")} · Budget: ${Number(row.budget_amount ?? 0).toLocaleString("en-IN")}`,
    href: `/projects/${row.id}`,
    entity_type: "project",
    entity_id: String(row.id),
    meta: "Project"
  }));
}

async function searchExceptions(context: ApiContext, query: string) {
  const { data } = await context.supabase
    .from("workflow_exceptions")
    .select("id, title, status, severity, category, entity_type, entity_id")
    .eq("org_id", context.orgId)
    .or(`title.ilike.%${query}%,category.ilike.%${query}%,status.ilike.%${query}%`)
    .limit(5);

  return (data ?? []).map((row) => ({
    id: `exception:${row.id}`,
    kind: "record" as const,
    group: "Exceptions",
    title: String(row.title ?? "Exception"),
    description: `${String(row.severity ?? "medium")} · ${String(row.status ?? "open")} · ${String(row.category ?? "operations")}`,
    href: getEntityHref(String(row.entity_type ?? ""), String(row.entity_id ?? "")) ?? "/exception-queue",
    entity_type: "workflow_exception",
    entity_id: String(row.id),
    meta: "Exception"
  }));
}

export async function GET(request: Request) {
  const auth = await requireApiContext();
  if (!auth.ok) {
    return fail(auth.status, { code: auth.code, message: auth.message });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  const staticEntries = filterStaticEntries(query);

  if (query.length < 2) {
    return ok({
      query,
      groups: [
        {
          key: "quick-links",
          label: "Quick Links",
          items: staticEntries
        }
      ] as SearchGroup[]
    });
  }

  const results = await Promise.all([
    searchCustomers(auth.context, query),
    searchVendors(auth.context, query),
    searchInvoices(auth.context, query),
    searchBills(auth.context, query),
    searchPayments(auth.context, query),
    searchBankAccounts(auth.context, query),
    searchProjects(auth.context, query),
    searchExceptions(auth.context, query)
  ]);

  const groups: SearchGroup[] = [
    ...results
      .map((items) => ({
        key: items[0]?.group.toLowerCase().replaceAll(" ", "-") ?? "",
        label: items[0]?.group ?? "",
        items
      }))
      .filter((group) => group.items.length > 0),
    {
      key: "app-links",
      label: "App Links",
      items: staticEntries
    }
  ];

  return ok({ query, groups });
}
