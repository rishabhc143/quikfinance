import { z } from "zod";
import { currencyCodeSchema, idSchema, moneySchema } from "@/lib/validations/common.schema";

export const paymentSchema = z.object({
  contact_id: idSchema.optional().nullable(),
  payment_type: z.enum(["received", "made"]),
  payment_date: z.coerce.date().transform((value) => value.toISOString().slice(0, 10)),
  amount: moneySchema,
  currency: currencyCodeSchema.default("INR"),
  exchange_rate: z.coerce.number().positive().default(1),
  method: z.string().trim().min(2).max(80),
  reference: z.string().max(120).optional().nullable(),
  status: z.enum(["draft", "posted", "void"]).default("posted"),
  memo: z.string().max(1000).optional().nullable()
});

export const expenseSchema = z.object({
  expense_date: z.coerce.date().transform((value) => value.toISOString().slice(0, 10)),
  vendor_id: idSchema.optional().nullable(),
  account_id: idSchema,
  project_id: idSchema.optional().nullable(),
  amount: moneySchema,
  tax_amount: moneySchema.default(0),
  currency: currencyCodeSchema.default("INR"),
  receipt_url: z.string().url().optional().nullable(),
  is_billable: z.boolean().default(false),
  description: z.string().trim().min(2).max(500),
  status: z.enum(["draft", "posted", "void"]).default("posted")
});

export const journalEntrySchema = z.object({
  entry_number: z.string().trim().min(2).max(40).optional(),
  entry_date: z.coerce.date().transform((value) => value.toISOString().slice(0, 10)),
  status: z.enum(["draft", "submitted", "approved", "posted", "void"]).default("draft"),
  memo: z.string().max(1000).optional().nullable(),
  source_type: z.string().max(80).optional().nullable(),
  source_id: idSchema.optional().nullable()
});

export const bankAccountSchema = z.object({
  account_id: idSchema.optional().nullable(),
  name: z.string().trim().min(2).max(160),
  institution_name: z.string().trim().max(160).optional().nullable(),
  account_number_last4: z.string().trim().max(4).optional().nullable(),
  currency: currencyCodeSchema.default("INR"),
  current_balance: moneySchema.default(0),
  is_active: z.boolean().default(true)
});

export const budgetSchema = z.object({
  name: z.string().trim().min(2).max(160),
  fiscal_year: z.coerce.number().int().min(2000).max(2100),
  status: z.enum(["draft", "active", "archived"]).default("draft"),
  total_amount: moneySchema.default(0)
});

export const fixedAssetSchema = z.object({
  asset_number: z.string().trim().min(2).max(40).optional(),
  name: z.string().trim().min(2).max(160),
  purchase_date: z.coerce.date().transform((value) => value.toISOString().slice(0, 10)),
  purchase_cost: moneySchema,
  salvage_value: moneySchema.default(0),
  useful_life_months: z.coerce.number().int().positive().max(600),
  depreciation_method: z.enum(["straight_line", "declining_balance"]).default("straight_line"),
  accumulated_depreciation: moneySchema.default(0),
  status: z.enum(["active", "disposed", "retired"]).default("active")
});

export const inventoryItemSchema = z.object({
  sku: z.string().trim().min(2).max(80),
  name: z.string().trim().min(2).max(160),
  unit: z.string().trim().min(1).max(20).default("each"),
  sales_price: moneySchema,
  purchase_price: moneySchema,
  quantity_on_hand: z.coerce.number().min(0).default(0),
  reorder_point: z.coerce.number().min(0).default(0),
  is_active: z.boolean().default(true)
});

export const projectSchema = z.object({
  name: z.string().trim().min(2).max(160),
  customer_id: idSchema.optional().nullable(),
  status: z.enum(["planned", "active", "on_hold", "complete"]).default("active"),
  budget_amount: moneySchema.default(0),
  billing_method: z.enum(["fixed_fee", "time_and_materials", "non_billable"]).default("time_and_materials")
});

export const taxRateSchema = z.object({
  name: z.string().trim().min(2).max(160),
  rate: z.coerce.number().min(0).max(100),
  tax_type: z.string().trim().min(2).max(80),
  is_compound: z.boolean().default(false),
  is_active: z.boolean().default(true)
});

export const currencySchema = z.object({
  code: currencyCodeSchema,
  name: z.string().trim().min(2).max(80),
  symbol: z.string().trim().min(1).max(8),
  decimal_places: z.coerce.number().int().min(0).max(4).default(2)
});
