import { NextRequest } from "next/server";
import { canManageFinance, requireApiContext } from "@/lib/api/auth";
import { fail, ok } from "@/lib/api/responses";
import { createInvoiceTransaction } from "@/lib/accounting/transactions";
import type { Json } from "@/types/database.types";

function addDays(date: string, days: number) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });
  if (!canManageFinance(auth.context.role)) {
    return fail(403, { code: "INSUFFICIENT_ROLE", message: "Only owners, admins, and accountants can convert time entries into invoice drafts." });
  }

  const body = await request.json().catch(() => ({}));
  const projectId = typeof body.project_id === "string" ? body.project_id : "";
  const entryIds = Array.isArray(body.entry_ids) ? body.entry_ids.filter((value: unknown): value is string => typeof value === "string") : [];

  if (!projectId) {
    return fail(422, { code: "VALIDATION_FAILED", message: "Project is required." });
  }

  const { data: project, error: projectError } = await auth.context.supabase
    .from("projects")
    .select("id, name, customer_id")
    .eq("org_id", auth.context.orgId)
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    return fail(404, { code: "PROJECT_NOT_FOUND", message: "Project was not found." });
  }

  if (!project.customer_id) {
    return fail(422, { code: "CUSTOMER_REQUIRED", message: "Assign a customer to the project before billing time." });
  }

  let query = auth.context.supabase
    .from("time_entries")
    .select("id, work_date, hours, rate, description")
    .eq("org_id", auth.context.orgId)
    .eq("project_id", projectId)
    .eq("is_billable", true)
    .eq("is_billed", false);

  if (entryIds.length > 0) {
    query = query.in("id", entryIds);
  }

  const { data: entries, error: entriesError } = await query.order("work_date", { ascending: true });
  if (entriesError) {
    return fail(400, { code: "TIME_ENTRY_LIST_FAILED", message: entriesError.message });
  }

  if (!(entries ?? []).length) {
    return fail(422, { code: "NO_BILLABLE_ENTRIES", message: "No unbilled billable time entries were found." });
  }

  const issueDate = new Date().toISOString().slice(0, 10);
  const { invoice } = await createInvoiceTransaction(auth.context, {
    contact_id: project.customer_id,
    issue_date: issueDate,
    due_date: addDays(issueDate, 7),
    status: "draft",
    currency: "INR",
    template_type: "modern",
    notes: `Generated from time entries for ${String(project.name ?? "project")}`,
    line_items: (entries ?? []).map((entry) => ({
      description: `${String(entry.description ?? "Time entry")} (${String(entry.work_date)})`,
      quantity: Number(entry.hours ?? 0),
      rate: Number(entry.rate ?? 0),
      gst_rate: 0,
      discount: 0
    }))
  });

  const ids = (entries ?? []).map((entry) => String(entry.id));
  await auth.context.supabase.from("time_entries").update({ is_billed: true }).eq("org_id", auth.context.orgId).in("id", ids);

  await auth.context.supabase.from("audit_logs").insert({
    org_id: auth.context.orgId,
    user_id: auth.context.userId,
    action: "invoice_draft_from_time",
    entity_type: "invoice",
    entity_id: String(invoice.id),
    new_values: { project_id: projectId, entry_ids: ids } as unknown as Json
  });

  return ok({ invoice, entry_count: ids.length });
}
