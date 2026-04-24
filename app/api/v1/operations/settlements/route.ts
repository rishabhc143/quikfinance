import { requireApiContext } from "@/lib/api/auth";
import { fail, ok } from "@/lib/api/responses";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiContext();
  if (!auth.ok) {
    return fail(auth.status, { code: auth.code, message: auth.message });
  }

  const supabase = auth.context.supabase;
  const orgId = auth.context.orgId;

  const [settlements, pendingCount, recentEvents] = await Promise.all([
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
      .limit(10)
  ]);

  const errors = [settlements.error, pendingCount.error, recentEvents.error].filter(Boolean);
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
      unprocessed_events: (recentEvents.data ?? []).filter((row) => !row.processed_at).length
    },
    settlements: rows,
    events: recentEvents.data ?? []
  });
}
