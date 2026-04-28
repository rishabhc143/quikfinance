import { requireApiContext } from "@/lib/api/auth";
import { fail, ok } from "@/lib/api/responses";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireApiContext();
  if (!auth.ok) {
    return fail(auth.status, { code: auth.code, message: auth.message });
  }

  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  const entityType = url.searchParams.get("entity_type");
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? "100"), 1), 500);

  let query = auth.context.supabase
    .from("audit_logs")
    .select("*")
    .eq("org_id", auth.context.orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (action && action !== "all") {
    query = query.eq("action", action);
  }

  if (entityType && entityType !== "all") {
    query = query.eq("entity_type", entityType);
  }

  const { data, error } = await query;

  if (error) {
    return fail(400, { code: "AUDIT_LIST_FAILED", message: error.message });
  }

  return ok(data ?? []);
}
