import { z } from "zod";
import { invoiceSchema } from "@/lib/validations/invoice.schema";

export const billSchema = invoiceSchema
  .omit({ invoice_number: true, status: true })
  .extend({
    bill_number: z.string().trim().min(2).max(40).optional(),
    status: z.enum(["draft", "submitted", "approved", "partial", "paid", "void"]).default("draft")
  });

export type BillInput = z.infer<typeof billSchema>;
