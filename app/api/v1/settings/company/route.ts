import type { NextRequest } from "next/server";
import { z } from "zod";
import { optionalGstinSchema, optionalPanSchema, optionalStateCodeSchema } from "@/lib/india";
import { requireApiContext } from "@/lib/api/auth";
import { fail, ok } from "@/lib/api/responses";

const companySchema = z.object({
  name: z.string().trim().min(2),
  legal_name: z.string().trim().optional().nullable(),
  tax_id: optionalGstinSchema,
  gstin: optionalGstinSchema,
  pan: optionalPanSchema,
  state_code: optionalStateCodeSchema,
  preferred_language: z.enum(["en", "hi"]).default("en"),
  default_upi_id: z.string().trim().max(120).optional().nullable(),
  base_currency: z.string().trim().length(3).default("INR"),
  fiscal_year_start: z.coerce.number().int().min(1).max(12).default(4),
  timezone: z.string().trim().default("Asia/Kolkata")
});

async function updateCompany(orgId: string, payload: Partial<z.infer<typeof companySchema>>) {
  const auth = await requireApiContext();
  if (!auth.ok) {
    return { auth };
  }

  const { data, error } = await auth.context.supabase
    .from("organizations")
    .update({
      ...payload,
      tax_id: payload.gstin ?? payload.tax_id ?? undefined
    })
    .eq("id", orgId)
    .select("*")
    .single();

  if (error) {
    return { auth, error };
  }

  return { auth, data };
}

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiContext();
  if (!auth.ok) {
    return fail(auth.status, { code: auth.code, message: auth.message });
  }

  const { data, error } = await auth.context.supabase.from("organizations").select("*").eq("id", auth.context.orgId).single();
  if (error || !data) {
    return fail(404, { code: "NOT_FOUND", message: "Company profile was not found." });
  }

  return ok(data);
}

export async function PUT(request: NextRequest) {
  const auth = await requireApiContext();
  if (!auth.ok) {
    return fail(auth.status, { code: auth.code, message: auth.message });
  }

  const parsed = companySchema.safeParse(await request.json());
  if (!parsed.success) {
    return fail(422, { code: "VALIDATION_FAILED", message: "The company profile is invalid.", details: parsed.error.flatten() });
  }

  const updated = await updateCompany(auth.context.orgId, parsed.data);
  if ("error" in updated && updated.error) {
    return fail(400, { code: "UPDATE_FAILED", message: updated.error.message });
  }

  return ok(updated.data);
}

export const POST = PUT;

export async function PATCH(request: NextRequest) {
  const auth = await requireApiContext();
  if (!auth.ok) {
    return fail(auth.status, { code: auth.code, message: auth.message });
  }

  const parsed = companySchema.partial().safeParse(await request.json());
  if (!parsed.success) {
    return fail(422, { code: "VALIDATION_FAILED", message: "The company profile patch is invalid.", details: parsed.error.flatten() });
  }

  const updated = await updateCompany(auth.context.orgId, parsed.data);
  if ("error" in updated && updated.error) {
    return fail(400, { code: "UPDATE_FAILED", message: updated.error.message });
  }

  return ok(updated.data);
}
