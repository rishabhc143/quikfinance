import { z } from "zod";
import { addressSchema, currencyCodeSchema, moneySchema } from "@/lib/validations/common.schema";

export const contactBaseSchema = z.object({
  display_name: z.string().trim().min(2).max(160),
  company_name: z.string().trim().max(160).optional().nullable(),
  first_name: z.string().trim().max(80).optional().nullable(),
  last_name: z.string().trim().max(80).optional().nullable(),
  email: z.string().trim().email().optional().or(z.literal("")).nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  website: z.string().trim().url().optional().or(z.literal("")).nullable(),
  tax_id: z.string().trim().max(80).optional().nullable(),
  currency: currencyCodeSchema.default("USD"),
  payment_terms: z.coerce.number().int().min(0).max(365).default(30),
  credit_limit: moneySchema.optional().nullable(),
  billing_address: addressSchema,
  shipping_address: addressSchema,
  notes: z.string().max(2000).optional().nullable(),
  is_active: z.boolean().default(true)
});

export const customerSchema = contactBaseSchema.extend({
  type: z.literal("customer").default("customer")
});

export type CustomerInput = z.infer<typeof customerSchema>;
