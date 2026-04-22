import { fail } from "@/lib/api/responses";
import type { ApiContext } from "@/lib/api/auth";

const scopeToLabels: Record<string, string[]> = {
  all: ["all"],
  sales: ["all", "sales"],
  purchases: ["all", "purchases"],
  banking: ["all", "banking"],
  journals: ["all", "journals"]
};

export async function findActivePeriodLock(context: ApiContext, date: string, scope: keyof typeof scopeToLabels) {
  const scopes = scopeToLabels[scope];
  const { data, error } = await context.supabase
    .from("period_locks")
    .select("id, start_date, end_date, lock_scope, reason")
    .eq("org_id", context.orgId)
    .eq("is_active", true)
    .lte("start_date", date)
    .gte("end_date", date);

  if (error) {
    throw new Error(error.message);
  }

  const row = (data ?? []).find((entry) => scopes.includes(String(entry.lock_scope ?? "")));
  return row ?? null;
}

export async function assertPeriodUnlocked(context: ApiContext, date: string | null | undefined, scope: keyof typeof scopeToLabels) {
  if (!date) {
    return null;
  }

  const lock = await findActivePeriodLock(context, date, scope);
  if (!lock) {
    return null;
  }

  return fail(423, {
    code: "PERIOD_LOCKED",
    message: `The selected period is locked from ${lock.start_date} to ${lock.end_date}.`,
    details: {
      lock_id: lock.id,
      lock_scope: lock.lock_scope,
      reason: lock.reason
    }
  });
}
