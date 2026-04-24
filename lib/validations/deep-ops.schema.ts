import { z } from "zod";
import { currencyCodeSchema, idSchema, moneySchema } from "@/lib/validations/common.schema";

export const bankFeedSchema = z.object({
  bank_account_id: idSchema.optional().nullable(),
  feed_name: z.string().trim().min(2).max(160),
  source_type: z.enum(["upload", "api", "manual"]).default("upload"),
  imported_on: z.coerce.date().transform((value) => value.toISOString().slice(0, 10)),
  statement_date: z.coerce.date().transform((value) => value.toISOString().slice(0, 10)),
  opening_balance: moneySchema.default(0),
  closing_balance: moneySchema.default(0),
  line_count: z.coerce.number().int().min(0).max(500000).default(0),
  currency: currencyCodeSchema.default("INR"),
  status: z.enum(["pending_review", "processing", "reconciled", "error"]).default("pending_review"),
  notes: z.string().max(1000).optional().nullable()
});

export const deliveryDispatchSchema = z.object({
  sales_order_id: idSchema.optional().nullable(),
  customer_id: idSchema.optional().nullable(),
  warehouse_id: idSchema.optional().nullable(),
  dispatch_number: z.string().trim().min(2).max(40).optional(),
  dispatch_date: z.coerce.date().transform((value) => value.toISOString().slice(0, 10)),
  carrier_name: z.string().trim().min(2).max(160),
  tracking_number: z.string().trim().max(120).optional().nullable(),
  shipped_value: moneySchema.default(0),
  status: z.enum(["draft", "packed", "shipped", "delivered", "cancelled"]).default("draft"),
  proof_status: z.enum(["pending", "received", "not_required"]).default("pending"),
  notes: z.string().max(1000).optional().nullable()
});

export const eInvoicingSchema = z.object({
  invoice_id: idSchema.optional().nullable(),
  invoice_number: z.string().trim().min(2).max(40),
  submission_number: z.string().trim().min(2).max(40).optional(),
  submission_date: z.coerce.date().transform((value) => value.toISOString().slice(0, 10)),
  taxable_value: moneySchema.default(0),
  total_tax: moneySchema.default(0),
  status: z.enum(["draft", "queued", "submitted", "generated", "failed", "cancelled"]).default("draft"),
  irn: z.string().trim().max(120).optional().nullable(),
  ack_number: z.string().trim().max(120).optional().nullable(),
  ack_date: z.coerce.date().transform((value) => value.toISOString().slice(0, 10)).optional().nullable(),
  error_message: z.string().max(1000).optional().nullable()
});

export const tdsTcsSchema = z.object({
  section_code: z.string().trim().min(2).max(40),
  tax_kind: z.enum(["tds", "tcs"]).default("tds"),
  transaction_type: z.enum(["bill", "invoice", "payment", "journal"]).default("bill"),
  transaction_id: idSchema.optional().nullable(),
  party_type: z.enum(["vendor", "customer"]).default("vendor"),
  party_id: idSchema.optional().nullable(),
  assessment_date: z.coerce.date().transform((value) => value.toISOString().slice(0, 10)),
  base_amount: moneySchema.default(0),
  tax_rate: z.coerce.number().min(0).max(100).default(0),
  tax_amount: moneySchema.default(0),
  status: z.enum(["draft", "review", "posted", "filed"]).default("draft"),
  notes: z.string().max(1000).optional().nullable()
});
