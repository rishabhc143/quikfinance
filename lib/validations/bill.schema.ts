import { z } from "zod";
import { invoiceSchema } from "@/lib/validations/invoice.schema";

export const billSchema = invoiceSchema
  .omit({ invoice_number: true, status: true, template_type: true, terms: true, round_off: true })
  .extend({
    bill_number: z.string().trim().min(2).max(40).optional(),
    tds_amount: z.coerce.number().min(0).default(0),
    status: z.enum(["draft", "submitted", "approved", "partial", "paid", "void"]).default("draft")
  });

export type BillInput = z.infer<typeof billSchema>;
