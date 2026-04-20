import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireApiContext } from "@/lib/api/auth";
import { fail, ok } from "@/lib/api/responses";

const companySchema = z.object({
  name: z.string().trim().min(2),
  legal_name: z.string().trim().optional(),
  tax_id: z.string().trim().optional(),
  base_currency: z.string().trim().length(3).default("USD"),
  timezone: z.string().trim().default("UTC")
});

export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest) {
  const auth = await requireApiContext();
  if (!auth.ok) {
    return fail(auth.status, { code: auth.code, message: auth.message });
  }

  const parsed = companySchema.safeParse(await request.json());
  if (!parsed.success) {
    return fail(422, { code: "VALIDATION_FAILED", message: "The company profile is invalid.", details: parsed.error.flatten() });
  }

  const { data, error } = await auth.context.supabase
    .from("organizations")
    .update(parsed.data)
    .eq("id", auth.context.orgId)
    .select("*")
    .single();

  if (error) {
    return fail(400, { code: "UPDATE_FAILED", message: error.message });
  }

  return ok(data);
}

export const POST = PUT;
