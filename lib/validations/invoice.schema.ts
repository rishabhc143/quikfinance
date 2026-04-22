import { z } from "zod";
import { currencyCodeSchema, idSchema, moneySchema } from "@/lib/validations/common.schema";

export const lineItemSchema = z.object({
  description: z.string().trim().min(1).max(500),
  quantity: z.coerce.number().positive(),
  rate: moneySchema,
  tax_rate_id: idSchema.optional().nullable(),
  discount: moneySchema.default(0),
  account_id: idSchema.optional().nullable()
});

export const invoiceSchema = z.object({
  contact_id: idSchema,
  invoice_number: z.string().trim().min(2).max(40).optional(),
  issue_date: z.coerce.date().transform((value) => value.toISOString().slice(0, 10)),
  due_date: z.coerce.date().transform((value) => value.toISOString().slice(0, 10)),
  status: z.enum(["draft", "sent", "viewed", "partial", "paid", "overdue", "void"]).default("draft"),
  currency: currencyCodeSchema.default("INR"),
  exchange_rate: z.coerce.number().positive().default(1),
  subtotal: moneySchema,
  discount_total: moneySchema.default(0),
  tax_total: moneySchema.default(0),
  round_off: z.coerce.number().min(-99.99).max(99.99).default(0),
  total: moneySchema,
  balance_due: moneySchema,
  place_of_supply: z.string().trim().max(2).optional().nullable(),
  template_type: z.enum(["classic", "modern", "minimal"]).default("classic"),
  terms: z.string().max(1000).optional().nullable(),
  notes: z.string().max(3000).optional().nullable(),
  line_items: z.array(lineItemSchema).min(1).optional()
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;
