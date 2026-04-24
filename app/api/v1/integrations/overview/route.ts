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

  const [
    paymentLinksCount,
    openPaymentLinksCount,
    pendingEventsCount,
    importsWithWarningsCount,
    bankFeedsCount,
    recentPaymentLinks,
    recentGatewayEvents,
    recentImports,
    recentBankFeeds
  ] = await Promise.all([
    supabase.from("invoice_payment_links").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    supabase.from("invoice_payment_links").select("id", { count: "exact", head: true }).eq("org_id", orgId).in("status", ["created", "issued", "partially_paid"]),
    supabase.from("gateway_events").select("id", { count: "exact", head: true }).eq("org_id", orgId).is("processed_at", null),
    supabase.from("import_jobs").select("id", { count: "exact", head: true }).eq("org_id", orgId).gt("failed_rows", 0),
    supabase.from("bank_feeds").select("id", { count: "exact", head: true }).eq("org_id", orgId).neq("status", "reconciled"),
    supabase
      .from("invoice_payment_links")
      .select("id, provider, status, amount, amount_paid, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("gateway_events")
      .select("id, provider, event_type, processed_at, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("import_jobs")
      .select("id, source_type, entity_type, status, imported_rows, failed_rows, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("bank_feeds")
      .select("id, feed_name, source_type, status, imported_on, line_count")
      .eq("org_id", orgId)
      .order("imported_on", { ascending: false })
      .limit(5)
  ]);

  const errors = [
    paymentLinksCount.error,
    openPaymentLinksCount.error,
    pendingEventsCount.error,
    importsWithWarningsCount.error,
    bankFeedsCount.error,
    recentPaymentLinks.error,
    recentGatewayEvents.error,
    recentImports.error,
    recentBankFeeds.error
  ].filter(Boolean);

  if (errors.length > 0) {
    return fail(500, { code: "INTEGRATIONS_OVERVIEW_FAILED", message: errors[0]?.message ?? "Integrations overview could not be loaded." });
  }

  return ok({
    configured: isRazorpayConfigured(),
    webhook_url: getRazorpayWebhookUrl(),
    metrics: {
      payment_links_total: paymentLinksCount.count ?? 0,
      payment_links_open: openPaymentLinksCount.count ?? 0,
      gateway_events_pending: pendingEventsCount.count ?? 0,
      import_jobs_with_warnings: importsWithWarningsCount.count ?? 0,
      bank_feeds_pending: bankFeedsCount.count ?? 0
    },
    recent_payment_links: recentPaymentLinks.data ?? [],
    recent_gateway_events: recentGatewayEvents.data ?? [],
    recent_import_jobs: recentImports.data ?? [],
    recent_bank_feeds: recentBankFeeds.data ?? []
  });
}
