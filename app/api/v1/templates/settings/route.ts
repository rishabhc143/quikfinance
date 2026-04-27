import { z } from "zod";
import { canManageCompany, requireApiContext } from "@/lib/api/auth";
import { fail, ok } from "@/lib/api/responses";

const templateSchema = z.object({
  invoice_prefix: z.string().trim().min(1).max(20).default("INV"),
  preferred_language: z.enum(["en", "hi"]).default("en"),
  base_currency: z.string().trim().length(3).default("INR"),
  default_invoice_template: z.enum(["classic", "modern", "minimal"]).default("classic"),
  default_quotation_template: z.enum(["classic", "modern", "minimal"]).default("classic"),
  invoice_note_template: z.string().trim().max(1000).optional().nullable(),
  quotation_note_template: z.string().trim().max(1000).optional().nullable()
});

function readAddress(record: Record<string, unknown>) {
  return typeof record.address === "object" && record.address !== null && !Array.isArray(record.address)
    ? (record.address as Record<string, unknown>)
    : {};
}

function readMeta(address: Record<string, unknown>) {
  return typeof address._meta === "object" && address._meta !== null && !Array.isArray(address._meta)
    ? (address._meta as Record<string, unknown>)
    : {};
}

function readSettings(record: Record<string, unknown>) {
  const address = readAddress(record);
  const meta = readMeta(address);
  const templateSettings =
    typeof meta.template_settings === "object" && meta.template_settings !== null && !Array.isArray(meta.template_settings)
      ? (meta.template_settings as Record<string, unknown>)
      : {};

  return {
    invoice_prefix: typeof record.invoice_prefix === "string" && record.invoice_prefix.trim() ? record.invoice_prefix : "INV",
    preferred_language:
      typeof record.preferred_language === "string" && ["en", "hi"].includes(record.preferred_language) ? record.preferred_language : "en",
    base_currency: typeof record.base_currency === "string" && record.base_currency.trim() ? record.base_currency : "INR",
    default_invoice_template:
      typeof templateSettings.default_invoice_template === "string" && ["classic", "modern", "minimal"].includes(templateSettings.default_invoice_template)
        ? templateSettings.default_invoice_template
        : "classic",
    default_quotation_template:
      typeof templateSettings.default_quotation_template === "string" && ["classic", "modern", "minimal"].includes(templateSettings.default_quotation_template)
        ? templateSettings.default_quotation_template
        : "classic",
    invoice_note_template: typeof templateSettings.invoice_note_template === "string" ? templateSettings.invoice_note_template : "",
    quotation_note_template: typeof templateSettings.quotation_note_template === "string" ? templateSettings.quotation_note_template : ""
  };
}

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiContext();
  if (!auth.ok) {
    return fail(auth.status, { code: auth.code, message: auth.message });
  }

  const { data, error } = await auth.context.supabase.from("organizations").select("*").eq("id", auth.context.orgId).single();
  if (error || !data) {
    return fail(404, { code: "NOT_FOUND", message: error?.message ?? "Template settings were not found." });
  }

  return ok(readSettings(data as Record<string, unknown>));
}

export async function PUT(request: Request) {
  const auth = await requireApiContext();
  if (!auth.ok) {
    return fail(auth.status, { code: auth.code, message: auth.message });
  }
  if (!canManageCompany(auth.context.role)) {
    return fail(403, { code: "INSUFFICIENT_ROLE", message: "Only owners and admins can update template settings." });
  }

  const json = await request.json().catch(() => ({}));
  const parsed = templateSchema.safeParse(json);
  if (!parsed.success) {
    return fail(422, { code: "VALIDATION_FAILED", message: "Template settings are invalid.", details: parsed.error.flatten() });
  }

  const current = await auth.context.supabase.from("organizations").select("*").eq("id", auth.context.orgId).single();
  if (current.error || !current.data) {
    return fail(404, { code: "NOT_FOUND", message: "Template settings were not found." });
  }

  const currentRecord = current.data as Record<string, unknown>;
  const address = readAddress(currentRecord);
  const meta = readMeta(address);
  const nextSettings = {
    ...readSettings(currentRecord),
    ...parsed.data
  };

  const updatePayload = {
    invoice_prefix: nextSettings.invoice_prefix,
    preferred_language: nextSettings.preferred_language,
    base_currency: nextSettings.base_currency,
    address: {
      ...address,
      _meta: {
        ...meta,
        template_settings: {
          default_invoice_template: nextSettings.default_invoice_template,
          default_quotation_template: nextSettings.default_quotation_template,
          invoice_note_template: nextSettings.invoice_note_template || null,
          quotation_note_template: nextSettings.quotation_note_template || null
        }
      }
    }
  };

  const { error } = await auth.context.supabase.from("organizations").update(updatePayload).eq("id", auth.context.orgId);
  if (error) {
    return fail(400, { code: "UPDATE_FAILED", message: error.message });
  }

  await auth.context.supabase.from("audit_logs").insert({
    org_id: auth.context.orgId,
    user_id: auth.context.userId,
    entity_type: "template_settings",
    entity_id: auth.context.orgId,
    action: "update",
    new_values: updatePayload
  });

  return ok(nextSettings);
}
