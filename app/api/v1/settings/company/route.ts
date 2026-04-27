import type { NextRequest } from "next/server";
import { z } from "zod";
import { optionalGstinSchema, optionalPanSchema, optionalStateCodeSchema } from "@/lib/india";
import { canManageCompany, requireApiContext } from "@/lib/api/auth";
import { fail, ok } from "@/lib/api/responses";
import { loadCompanySetupSnapshot } from "@/lib/company-setup";

const businessTypes = ["proprietorship", "partnership", "llp", "pvt_ltd", "public_ltd", "other"] as const;
const paymentTerms = ["Due on receipt", "Net 7", "Net 15", "Net 30", "Custom"] as const;

const companySchema = z.object({
  name: z.string().trim().min(2),
  legal_name: z.string().trim().optional().nullable(),
  business_type: z.enum(businessTypes).optional().nullable(),
  industry: z.string().trim().max(160).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().trim().max(40).optional().nullable(),
  website: z.string().trim().max(160).optional().nullable(),
  logo_url: z.string().trim().max(500).optional().nullable(),
  address_line1: z.string().trim().max(200).optional().nullable(),
  address_line2: z.string().trim().max(200).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  state_code: optionalStateCodeSchema,
  country: z.string().trim().max(120).optional().nullable(),
  pin_code: z.string().trim().max(20).optional().nullable(),
  tax_id: optionalGstinSchema,
  gstin: optionalGstinSchema,
  pan: optionalPanSchema,
  preferred_language: z.enum(["en", "hi"]).default("en"),
  default_upi_id: z.string().trim().max(120).optional().nullable(),
  base_currency: z.string().trim().length(3).default("INR"),
  fiscal_year_start: z.coerce.number().int().min(1).max(12).default(4),
  fiscal_year_start_month: z.coerce.number().int().min(1).max(12).default(4),
  fiscal_year_start_date: z.string().trim().optional().nullable(),
  fiscal_year_end_date: z.string().trim().optional().nullable(),
  timezone: z.string().trim().default("Asia/Kolkata"),
  accounting_method: z.enum(["cash", "accrual"]).default("accrual"),
  invoice_prefix: z.string().trim().min(1).max(20).default("INV"),
  invoice_next_number: z.coerce.number().int().min(1).default(1),
  payment_terms: z.enum(paymentTerms).default("Net 30"),
  gst_registered: z.coerce.boolean().default(false),
  gst_filing_frequency: z.enum(["monthly", "quarterly"]).default("monthly"),
  place_of_supply: optionalStateCodeSchema
});

function buildAddress(payload: z.infer<typeof companySchema>) {
  return {
    line1: payload.address_line1 ?? "",
    line2: payload.address_line2 ?? "",
    city: payload.city ?? "",
    state_code: payload.state_code ?? "",
    country: payload.country ?? "",
    pin_code: payload.pin_code ?? ""
  };
}

function normalizeStoredCompany(data: Record<string, unknown>) {
  const address = typeof data.address === "object" && data.address !== null && !Array.isArray(data.address) ? (data.address as Record<string, unknown>) : {};
  const meta = typeof address._meta === "object" && address._meta !== null && !Array.isArray(address._meta) ? (address._meta as Record<string, unknown>) : {};
  return {
    ...data,
    address_line1: typeof address.line1 === "string" ? address.line1 : "",
    address_line2: typeof address.line2 === "string" ? address.line2 : "",
    city: typeof data.city === "string" ? data.city : typeof address.city === "string" ? address.city : "",
    state_code: typeof data.state_code === "string" ? data.state_code : typeof address.state_code === "string" ? address.state_code : "",
    country: typeof data.country === "string" ? data.country : typeof address.country === "string" ? address.country : "",
    pin_code: typeof data.pin_code === "string" ? data.pin_code : typeof address.pin_code === "string" ? address.pin_code : "",
    website: typeof data.website === "string" ? data.website : typeof meta.website === "string" ? meta.website : "",
    business_type: typeof data.business_type === "string" ? data.business_type : typeof meta.business_type === "string" ? meta.business_type : null,
    industry: typeof data.industry === "string" ? data.industry : typeof meta.industry === "string" ? meta.industry : "",
    gst_registered: typeof data.gst_registered === "boolean" ? data.gst_registered : typeof meta.gst_registered === "boolean" ? meta.gst_registered : Boolean(data.gstin),
    gst_filing_frequency: typeof data.gst_filing_frequency === "string" ? data.gst_filing_frequency : typeof meta.gst_filing_frequency === "string" ? meta.gst_filing_frequency : "monthly",
    place_of_supply: typeof data.place_of_supply === "string" ? data.place_of_supply : typeof meta.place_of_supply === "string" ? meta.place_of_supply : typeof data.state_code === "string" ? data.state_code : "",
    fiscal_year_start_month: typeof data.fiscal_year_start_month === "number" ? data.fiscal_year_start_month : typeof data.fiscal_year_start === "number" ? data.fiscal_year_start : typeof meta.fiscal_year_start_month === "number" ? meta.fiscal_year_start_month : 4,
    fiscal_year_start_date: typeof data.fiscal_year_start_date === "string" ? data.fiscal_year_start_date : typeof meta.fiscal_year_start_date === "string" ? meta.fiscal_year_start_date : "",
    fiscal_year_end_date: typeof data.fiscal_year_end_date === "string" ? data.fiscal_year_end_date : typeof meta.fiscal_year_end_date === "string" ? meta.fiscal_year_end_date : "",
    accounting_method: typeof data.accounting_method === "string" ? data.accounting_method : typeof meta.accounting_method === "string" ? meta.accounting_method : "accrual",
    invoice_next_number: typeof data.invoice_next_number === "number" ? data.invoice_next_number : typeof meta.invoice_next_number === "number" ? meta.invoice_next_number : 1,
    payment_terms: typeof data.payment_terms === "string" ? data.payment_terms : typeof meta.payment_terms === "string" ? meta.payment_terms : "Net 30"
  };
}

function buildUpdatePayload(payload: z.infer<typeof companySchema>) {
  return {
    name: payload.name,
    legal_name: payload.legal_name || null,
    business_type: payload.business_type || null,
    industry: payload.industry || null,
    email: payload.email || null,
    phone: payload.phone || null,
    website: payload.website || null,
    logo_url: payload.logo_url || null,
    address: buildAddress(payload),
    city: payload.city || null,
    state_code: payload.state_code || null,
    country: payload.country || null,
    pin_code: payload.pin_code || null,
    tax_id: payload.gstin ?? payload.tax_id ?? null,
    gstin: payload.gstin ?? null,
    pan: payload.pan ?? null,
    preferred_language: payload.preferred_language,
    default_upi_id: payload.default_upi_id || null,
    base_currency: payload.base_currency,
    fiscal_year_start: payload.fiscal_year_start,
    fiscal_year_start_month: payload.fiscal_year_start_month,
    fiscal_year_start_date: payload.fiscal_year_start_date || null,
    fiscal_year_end_date: payload.fiscal_year_end_date || null,
    timezone: payload.timezone,
    accounting_method: payload.accounting_method,
    invoice_prefix: payload.invoice_prefix,
    invoice_next_number: payload.invoice_next_number,
    payment_terms: payload.payment_terms,
    gst_registered: payload.gst_registered,
    gst_filing_frequency: payload.gst_filing_frequency,
    place_of_supply: payload.place_of_supply || null
  };
}

function filterSupportedUpdatePayload(current: Record<string, unknown>, payload: Record<string, unknown>) {
  const supported = new Set(Object.keys(current));
  const existingAddress =
    typeof current.address === "object" && current.address !== null && !Array.isArray(current.address)
      ? (current.address as Record<string, unknown>)
      : {};
  const existingMeta =
    typeof existingAddress._meta === "object" && existingAddress._meta !== null && !Array.isArray(existingAddress._meta)
      ? (existingAddress._meta as Record<string, unknown>)
      : {};

  const nextAddress = {
    line1: payload.address && typeof payload.address === "object" && !Array.isArray(payload.address) ? (payload.address as Record<string, unknown>).line1 ?? existingAddress.line1 ?? "" : existingAddress.line1 ?? "",
    line2: payload.address && typeof payload.address === "object" && !Array.isArray(payload.address) ? (payload.address as Record<string, unknown>).line2 ?? existingAddress.line2 ?? "" : existingAddress.line2 ?? "",
    city: payload.address && typeof payload.address === "object" && !Array.isArray(payload.address) ? (payload.address as Record<string, unknown>).city ?? existingAddress.city ?? "" : existingAddress.city ?? "",
    state_code: payload.address && typeof payload.address === "object" && !Array.isArray(payload.address) ? (payload.address as Record<string, unknown>).state_code ?? existingAddress.state_code ?? "" : existingAddress.state_code ?? "",
    country: payload.address && typeof payload.address === "object" && !Array.isArray(payload.address) ? (payload.address as Record<string, unknown>).country ?? existingAddress.country ?? "" : existingAddress.country ?? "",
    pin_code: payload.address && typeof payload.address === "object" && !Array.isArray(payload.address) ? (payload.address as Record<string, unknown>).pin_code ?? existingAddress.pin_code ?? "" : existingAddress.pin_code ?? "",
    _meta: {
      ...existingMeta,
      website: payload.website ?? existingMeta.website ?? null,
      business_type: payload.business_type ?? existingMeta.business_type ?? null,
      industry: payload.industry ?? existingMeta.industry ?? null,
      gst_registered: payload.gst_registered ?? existingMeta.gst_registered ?? false,
      gst_filing_frequency: payload.gst_filing_frequency ?? existingMeta.gst_filing_frequency ?? "monthly",
      place_of_supply: payload.place_of_supply ?? existingMeta.place_of_supply ?? null,
      fiscal_year_start_month: payload.fiscal_year_start_month ?? existingMeta.fiscal_year_start_month ?? payload.fiscal_year_start ?? 4,
      fiscal_year_start_date: payload.fiscal_year_start_date ?? existingMeta.fiscal_year_start_date ?? null,
      fiscal_year_end_date: payload.fiscal_year_end_date ?? existingMeta.fiscal_year_end_date ?? null,
      accounting_method: payload.accounting_method ?? existingMeta.accounting_method ?? "accrual",
      invoice_next_number: payload.invoice_next_number ?? existingMeta.invoice_next_number ?? 1,
      payment_terms: payload.payment_terms ?? existingMeta.payment_terms ?? "Net 30"
    }
  };

  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (key === "address" && supported.has("address")) {
      filtered.address = nextAddress;
      continue;
    }
    if (supported.has(key)) {
      filtered[key] = value;
    }
  }

  if (supported.has("fiscal_year_start") && typeof payload.fiscal_year_start_month === "number") {
    filtered.fiscal_year_start = payload.fiscal_year_start_month;
  }
  if (supported.has("address")) {
    filtered.address = nextAddress;
  }
  return filtered;
}

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiContext();
  if (!auth.ok) {
    return fail(auth.status, { code: auth.code, message: auth.message });
  }

  try {
    const snapshot = await loadCompanySetupSnapshot(auth.context);
    return ok({
      ...normalizeStoredCompany(snapshot.company),
      setup_completed: snapshot.setup_completed,
      required_missing: snapshot.required_missing,
      checklist: snapshot.checklist,
      progress_percent: snapshot.progress_percent
    });
  } catch (error) {
    return fail(404, { code: "NOT_FOUND", message: error instanceof Error ? error.message : "Company profile was not found." });
  }
}

async function upsertCompany(request: NextRequest, partial = false) {
  const auth = await requireApiContext();
  if (!auth.ok) {
    return fail(auth.status, { code: auth.code, message: auth.message });
  }
  if (!canManageCompany(auth.context.role)) {
    return fail(403, { code: "INSUFFICIENT_ROLE", message: "Only owners and admins can update company settings." });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = (partial ? companySchema.partial() : companySchema).safeParse(body);
  if (!parsed.success) {
    return fail(422, { code: "VALIDATION_FAILED", message: "The company profile is invalid.", details: parsed.error.flatten() });
  }

  const current = await auth.context.supabase.from("organizations").select("*").eq("id", auth.context.orgId).single();
  if (current.error || !current.data) {
    return fail(404, { code: "NOT_FOUND", message: "Company profile was not found." });
  }

  const merged = {
    ...normalizeStoredCompany(current.data as Record<string, unknown>),
    ...parsed.data
  } as z.infer<typeof companySchema>;
  const updatePayload = filterSupportedUpdatePayload(current.data as Record<string, unknown>, buildUpdatePayload(merged) as Record<string, unknown>);

  const { error } = await auth.context.supabase.from("organizations").update(updatePayload).eq("id", auth.context.orgId);
  if (error) {
    return fail(400, { code: "UPDATE_FAILED", message: error.message });
  }

  const snapshot = await loadCompanySetupSnapshot(auth.context);
  if (Object.prototype.hasOwnProperty.call(current.data, "setup_completed")) {
    await auth.context.supabase.from("organizations").update({ setup_completed: snapshot.setup_completed }).eq("id", auth.context.orgId);
  }
  await auth.context.supabase.from("audit_logs").insert({
    org_id: auth.context.orgId,
    user_id: auth.context.userId,
    entity_type: "company",
    entity_id: auth.context.orgId,
    action: "update",
    new_values: updatePayload
  });

  return ok({
    ...normalizeStoredCompany(snapshot.company),
    setup_completed: snapshot.setup_completed,
    required_missing: snapshot.required_missing,
    checklist: snapshot.checklist,
    progress_percent: snapshot.progress_percent
  });
}

export async function PUT(request: NextRequest) {
  return upsertCompany(request, false);
}

export async function PATCH(request: NextRequest) {
  return upsertCompany(request, true);
}

export const POST = PUT;
