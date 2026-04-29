import { canManageFinance, requireApiContext } from "@/lib/api/auth";
import { fail, ok } from "@/lib/api/responses";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiContext();
  if (!auth.ok) {
    return fail(auth.status, { code: auth.code, message: auth.message });
  }
  if (!canManageFinance(auth.context.role)) {
    return fail(403, { code: "INSUFFICIENT_ROLE", message: "Only owners, admins, and accountants can view assignable users." });
  }

  const { data, error } = await auth.context.supabase
    .from("profiles")
    .select("id, full_name, role, is_active")
    .eq("org_id", auth.context.orgId)
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  if (error) {
    return fail(500, { code: "LIST_FAILED", message: error.message });
  }

  return ok(
    (data ?? []).map((row) => ({
      id: String(row.id),
      full_name: row.full_name ?? "Unnamed user",
      role: String(row.role ?? "member")
    }))
  );
}
