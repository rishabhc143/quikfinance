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

  const [closeTasks, openExceptions, pendingApprovals, periodLocks] = await Promise.all([
    supabase
      .from("close_tasks")
      .select("id, title, owner_role, status, due_date, period_start, period_end, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("workflow_exceptions")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .in("status", ["open", "in_progress"]),
    supabase
      .from("approval_requests")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "pending"),
    supabase
      .from("period_locks")
      .select("id, start_date, end_date, lock_scope, is_active, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(10)
  ]);

  const errors = [closeTasks.error, openExceptions.error, pendingApprovals.error, periodLocks.error].filter(Boolean);
  if (errors.length > 0) {
    return fail(500, { code: "CLOSE_MANAGEMENT_OVERVIEW_FAILED", message: errors[0]?.message ?? "Close management overview could not be loaded." });
  }

  const tasks = closeTasks.data ?? [];
  const doneCount = tasks.filter((task) => String(task.status) === "done").length;
  const progress = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

  return ok({
    metrics: {
      open_tasks: tasks.filter((task) => String(task.status) !== "done").length,
      blocked_tasks: tasks.filter((task) => String(task.status) === "blocked").length,
      ready_to_lock: (openExceptions.count ?? 0) === 0 && (pendingApprovals.count ?? 0) === 0,
      progress
    },
    tasks,
    period_locks: periodLocks.data ?? [],
    dependencies: {
      open_exceptions: openExceptions.count ?? 0,
      pending_approvals: pendingApprovals.count ?? 0
    }
  });
}
