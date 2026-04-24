import { z } from "zod";
import { invoiceSchemaBase } from "@/lib/validations/invoice.schema";

export const billSchema = invoiceSchemaBase
  .omit({ invoice_number: true, status: true, template_type: true, terms: true, round_off: true })
  .extend({
    bill_number: z.string().trim().min(2).max(40).optional(),
    tds_amount: z.coerce.number().min(0).default(0),
    status: z.enum(["draft", "submitted", "approved", "partial", "paid", "void"]).default("draft")
  })
  .refine((value) => value.due_date >= value.issue_date, {
    message: "Due date must be on or after bill date.",
    path: ["due_date"]
  });

export type BillInput = z.infer<typeof billSchema>;
