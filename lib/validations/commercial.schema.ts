import { z } from "zod";
import { currencyCodeSchema, idSchema, moneySchema } from "@/lib/validations/common.schema";

const statusLabelSchema = z.string().trim().min(2).max(80);

const baseCommercialSchema = z.object({
  contact_id: idSchema,
  issue_date: z.coerce.date().transform((value) => value.toISOString().slice(0, 10)),
  due_date: z.coerce.date().transform((value) => value.toISOString().slice(0, 10)).optional(),
  subtotal: moneySchema,
  tax_total: moneySchema.default(0),
  total: moneySchema,
  currency: currencyCodeSchema.default("INR"),
  notes: z.string().max(3000).optional().nullable()
});

export const quotationSchema = baseCommercialSchema.extend({
  quotation_number: z.string().trim().min(2).max(40).optional(),
  status: statusLabelSchema.default("draft")
});

export const salesOrderSchema = baseCommercialSchema.extend({
  sales_order_number: z.string().trim().min(2).max(40).optional(),
  status: statusLabelSchema.default("draft")
});

export const purchaseOrderSchema = baseCommercialSchema.extend({
  purchase_order_number: z.string().trim().min(2).max(40).optional(),
  status: statusLabelSchema.default("draft")
});

export const creditNoteSchema = baseCommercialSchema.extend({
  invoice_id: idSchema.optional().nullable(),
  credit_note_number: z.string().trim().min(2).max(40).optional(),
  status: statusLabelSchema.default("draft")
});

export const vendorCreditSchema = baseCommercialSchema.extend({
  bill_id: idSchema.optional().nullable(),
  vendor_credit_number: z.string().trim().min(2).max(40).optional(),
  status: statusLabelSchema.default("draft")
});

export const timeEntrySchema = z.object({
  project_id: idSchema,
  work_date: z.coerce.date().transform((value) => value.toISOString().slice(0, 10)),
  hours: z.coerce.number().positive().max(24),
  description: z.string().trim().min(2).max(1000),
  is_billable: z.boolean().default(true),
  is_billed: z.boolean().default(false),
  rate: moneySchema.default(0)
});
