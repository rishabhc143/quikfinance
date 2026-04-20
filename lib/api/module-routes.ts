import type { ApiContext } from "@/lib/api/auth";
import type { CrudConfig } from "@/lib/api/crud";
import { accountSchema } from "@/lib/validations/account.schema";
import { billSchema } from "@/lib/validations/bill.schema";
import { customerSchema } from "@/lib/validations/customer.schema";
import { invoiceSchema } from "@/lib/validations/invoice.schema";
import {
  bankAccountSchema,
  budgetSchema,
  currencySchema,
  expenseSchema,
  fixedAssetSchema,
  inventoryItemSchema,
  journalEntrySchema,
  paymentSchema,
  projectSchema,
  taxRateSchema
} from "@/lib/validations/operations.schema";
import { vendorSchema } from "@/lib/validations/vendor.schema";

function withoutFields(body: Record<string, unknown>, fields: string[]) {
  return Object.fromEntries(Object.entries(body).filter(([key]) => !fields.includes(key)));
}

function sequenceNumber(prefix: string) {
  return `${prefix}-${Date.now().toString().slice(-6)}`;
}

function prepareInvoice(body: Record<string, unknown>) {
  const payload = withoutFields(body, ["line_items"]);
  return {
    ...payload,
    invoice_number: typeof payload.invoice_number === "string" && payload.invoice_number.length > 0 ? payload.invoice_number : sequenceNumber("INV")
  };
}

function prepareBill(body: Record<string, unknown>) {
  const payload = withoutFields(body, ["line_items"]);
  return {
    ...payload,
    bill_number: typeof payload.bill_number === "string" && payload.bill_number.length > 0 ? payload.bill_number : sequenceNumber("BILL")
  };
}

function prepareJournalEntry(body: Record<string, unknown>) {
  return {
    ...body,
    entry_number: typeof body.entry_number === "string" && body.entry_number.length > 0 ? body.entry_number : sequenceNumber("JE")
  };
}

function prepareFixedAsset(body: Record<string, unknown>) {
  return {
    ...body,
    asset_number: typeof body.asset_number === "string" && body.asset_number.length > 0 ? body.asset_number : sequenceNumber("FA")
  };
}

function keepContext(_body: Record<string, unknown>, _context: ApiContext) {
  return _body;
}

export const customerRouteConfig: CrudConfig<"contacts"> = {
  table: "contacts",
  schema: customerSchema,
  entity: "customer",
  searchColumn: "display_name",
  orderColumn: "display_name",
  fixedFilters: { type: "customer" },
  prepareCreate: (body) => ({ ...body, type: "customer" })
};

export const vendorRouteConfig: CrudConfig<"contacts"> = {
  table: "contacts",
  schema: vendorSchema,
  entity: "vendor",
  searchColumn: "display_name",
  orderColumn: "display_name",
  fixedFilters: { type: "vendor" },
  prepareCreate: (body) => ({ ...body, type: "vendor" })
};

export const invoiceRouteConfig: CrudConfig<"invoices"> = {
  table: "invoices",
  schema: invoiceSchema,
  entity: "invoice",
  searchColumn: "invoice_number",
  prepareCreate: prepareInvoice,
  prepareUpdate: prepareInvoice
};

export const billRouteConfig: CrudConfig<"bills"> = {
  table: "bills",
  schema: billSchema,
  entity: "bill",
  searchColumn: "bill_number",
  prepareCreate: prepareBill,
  prepareUpdate: prepareBill
};

export const paymentRouteConfig: CrudConfig<"payments"> = {
  table: "payments",
  schema: paymentSchema,
  entity: "payment",
  orderColumn: "payment_date"
};

export const expenseRouteConfig: CrudConfig<"expenses"> = {
  table: "expenses",
  schema: expenseSchema,
  entity: "expense",
  searchColumn: "description",
  orderColumn: "expense_date"
};

export const journalRouteConfig: CrudConfig<"journal_entries"> = {
  table: "journal_entries",
  schema: journalEntrySchema,
  entity: "journal_entry",
  searchColumn: "entry_number",
  orderColumn: "entry_date",
  prepareCreate: prepareJournalEntry,
  prepareUpdate: keepContext
};

export const accountRouteConfig: CrudConfig<"accounts"> = {
  table: "accounts",
  schema: accountSchema,
  entity: "account",
  searchColumn: "name",
  orderColumn: "code"
};

export const bankAccountRouteConfig: CrudConfig<"bank_accounts"> = {
  table: "bank_accounts",
  schema: bankAccountSchema,
  entity: "bank_account",
  searchColumn: "name",
  orderColumn: "name"
};

export const budgetRouteConfig: CrudConfig<"budgets"> = {
  table: "budgets",
  schema: budgetSchema,
  entity: "budget",
  searchColumn: "name",
  orderColumn: "fiscal_year"
};

export const fixedAssetRouteConfig: CrudConfig<"fixed_assets"> = {
  table: "fixed_assets",
  schema: fixedAssetSchema,
  entity: "fixed_asset",
  searchColumn: "name",
  prepareCreate: prepareFixedAsset,
  prepareUpdate: prepareFixedAsset
};

export const inventoryRouteConfig: CrudConfig<"items"> = {
  table: "items",
  schema: inventoryItemSchema,
  entity: "inventory_item",
  searchColumn: "name",
  orderColumn: "sku"
};

export const projectRouteConfig: CrudConfig<"projects"> = {
  table: "projects",
  schema: projectSchema,
  entity: "project",
  searchColumn: "name",
  orderColumn: "name"
};

export const taxRouteConfig: CrudConfig<"tax_rates"> = {
  table: "tax_rates",
  schema: taxRateSchema,
  entity: "tax_rate",
  searchColumn: "name",
  orderColumn: "name"
};

export const currencyRouteConfig: CrudConfig<"currencies"> = {
  table: "currencies",
  schema: currencySchema,
  entity: "currency",
  searchColumn: "name",
  orderColumn: "code",
  orgScoped: false
};
