import { requireApiContext } from "@/lib/api/auth";
import { fail, ok } from "@/lib/api/responses";
import { getRazorpayWebhookUrl, isRazorpayConfigured } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiContext();
  if (!auth.ok) {
    return fail(auth.status, { code: auth.code, message: auth.message });
  }

  const supabase = auth.context.supabase;
  const orgId = auth.context.orgId;

  const [recentEvents, paymentLinks, settlements] = await Promise.all([
    supabase
      .from("gateway_events")
      .select("id, provider, event_type, processed_at, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("invoice_payment_links")
      .select("id, status, amount, amount_paid, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("razorpay_settlements")
      .select("id, status, net_amount, settlement_date")
      .eq("org_id", orgId)
      .order("settlement_date", { ascending: false })
      .limit(12)
  ]);

  const errors = [recentEvents.error, paymentLinks.error, settlements.error].filter(Boolean);
  if (errors.length > 0) {
    return fail(500, { code: "PAYMENT_GATEWAYS_OVERVIEW_FAILED", message: errors[0]?.message ?? "Payment gateway overview could not be loaded." });
  }

  const events = recentEvents.data ?? [];
  const links = paymentLinks.data ?? [];
  const settlementRows = settlements.data ?? [];

  return ok({
    configured: isRazorpayConfigured(),
    webhook_url: getRazorpayWebhookUrl(),
    metrics: {
      connected_gateways: isRazorpayConfigured() ? 1 : 0,
      unprocessed_events: events.filter((event) => !event.processed_at).length,
      open_payment_links: links.filter((link) => ["created", "issued", "partially_paid"].includes(String(link.status))).length,
      pending_settlements: settlementRows.filter((row) => String(row.status) === "pending").length
    },
    events,
    payment_links: links,
    settlements: settlementRows
  });
}
