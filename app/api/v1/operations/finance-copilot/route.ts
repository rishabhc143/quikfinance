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

  const { data, error } = await supabase
    .from("finance_insights")
    .select("id, insight_type, title, summary, severity, status, source_payload, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return fail(500, { code: "FINANCE_COPILOT_OVERVIEW_FAILED", message: error.message });
  }

  const insights = data ?? [];
  return ok({
    metrics: {
      open_insights: insights.filter((item) => String(item.status) === "open").length,
      critical_insights: insights.filter((item) => String(item.severity) === "critical").length,
      accepted_insights: insights.filter((item) => String(item.status) === "accepted").length,
      dismissed_insights: insights.filter((item) => String(item.status) === "dismissed").length
    },
    insights
  });
}
