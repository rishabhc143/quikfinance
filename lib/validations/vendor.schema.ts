import { contactBaseSchema } from "@/lib/validations/customer.schema";
import { z } from "zod";

export const vendorSchema = contactBaseSchema.extend({
  type: z.literal("vendor").default("vendor")
});

export type VendorInput = z.infer<typeof vendorSchema>;
