import { canManageBanking, requireApiContext } from "@/lib/api/auth";
import { fail, ok } from "@/lib/api/responses";
import { resolveWorkflowExceptions, upsertWorkflowException } from "@/lib/compliance/exceptions";
import type { Json } from "@/types/database.types";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiContext();
  if (!auth.ok) {
    return fail(auth.status, { code: auth.code, message: auth.message });
  }

  const supabase = auth.context.supabase;
  const orgId = auth.context.orgId;

  const [settlements, pendingCount, recentEvents, settlementExceptions] = await Promise.all([
    supabase
      .from("razorpay_settlements")
      .select("id, settlement_id, settlement_date, gross_amount, fee_amount, tax_amount, net_amount, status, created_at")
      .eq("org_id", orgId)
      .order("settlement_date", { ascending: false })
      .limit(12),
    supabase
      .from("razorpay_settlements")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "pending"),
    supabase
      .from("gateway_events")
      .select("id, provider, event_type, processed_at, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("workflow_exceptions")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("entity_type", "razorpay_settlement")
      .in("status", ["open", "in_progress"])
  ]);

  const errors = [settlements.error, pendingCount.error, recentEvents.error, settlementExceptions.error].filter(Boolean);
  if (errors.length > 0) {
    return fail(500, { code: "SETTLEMENTS_OVERVIEW_FAILED", message: errors[0]?.message ?? "Settlements overview could not be loaded." });
  }

  const rows = settlements.data ?? [];
  const totalNet = rows.reduce((sum, row) => sum + Number(row.net_amount ?? 0), 0);

  return ok({
    metrics: {
      pending_count: pendingCount.count ?? 0,
      settlements_count: rows.length,
      total_net: totalNet,
      unprocessed_events: (recentEvents.data ?? []).filter((row) => !row.processed_at).length,
      open_exceptions: settlementExceptions.count ?? 0
    },
    settlements: rows,
    events: recentEvents.data ?? []
  });
}

export async function PATCH(request: Request) {
  const auth = await requireApiContext();
  if (!auth.ok) {
    return fail(auth.status, { code: auth.code, message: auth.message });
  }
  if (!canManageBanking(auth.context.role)) {
    return fail(403, { code: "INSUFFICIENT_ROLE", message: "Only owners, admins, and accountants can update settlements." });
  }

  const body = await request.json().catch(() => ({})) as { id?: string; status?: string; note?: string | null };
  const id = typeof body.id === "string" ? body.id : "";
  const status = typeof body.status === "string" ? body.status : "";
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;

  if (!id || !status || !["pending", "matched", "posted", "exception"].includes(status)) {
    return fail(422, { code: "VALIDATION_FAILED", message: "Settlement id and a valid status are required." });
  }

  const { data: settlement, error: settlementError } = await auth.context.supabase
    .from("razorpay_settlements")
    .update({ status })
    .eq("org_id", auth.context.orgId)
    .eq("id", id)
    .select("id, settlement_id, status, net_amount, settlement_date")
    .single();

  if (settlementError || !settlement) {
    return fail(400, { code: "UPDATE_FAILED", message: settlementError?.message ?? "Settlement could not be updated." });
  }

  if (status === "exception") {
    await upsertWorkflowException(auth.context, {
      category: "bank",
      severity: "high",
      title: "Settlement requires review",
      description: note ?? `Settlement ${String(settlement.settlement_id)} could not be matched cleanly.`,
      entityType: "razorpay_settlement",
      entityId: id
    });
  } else if (["matched", "posted"].includes(status)) {
    await resolveWorkflowExceptions(auth.context, {
      entityType: "razorpay_settlement",
      entityId: id,
      resolution: note ?? `Settlement moved to ${status}`
    });
  }

  await auth.context.supabase.from("audit_logs").insert({
    org_id: auth.context.orgId,
    user_id: auth.context.userId,
    entity_type: "razorpay_settlement",
    entity_id: id,
    action: "status_update",
    new_values: { status, note } as Json
  });

  return ok(settlement);
}
