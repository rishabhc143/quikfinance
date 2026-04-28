import { NextRequest } from "next/server";
import { canWriteData, requireApiContext } from "@/lib/api/auth";
import { fail, ok } from "@/lib/api/responses";
import type { Json } from "@/types/database.types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });
  if (!canWriteData(auth.context.role)) {
    return fail(403, { code: "READ_ONLY_ROLE", message: "Your role has read-only access." });
  }

  const body = await request.json().catch(() => ({}));
  const { data, error } = await auth.context.supabase
    .from("fixed_assets")
    .update({ status: "disposed" })
    .eq("org_id", auth.context.orgId)
    .eq("id", params.id)
    .select("*")
    .single();

  if (error || !data) {
    return fail(404, { code: "NOT_FOUND", message: "Fixed asset was not found." });
  }

  await auth.context.supabase.from("audit_logs").insert({
    org_id: auth.context.orgId,
    user_id: auth.context.userId,
    action: "dispose",
    entity_type: "fixed_asset",
    entity_id: params.id,
    new_values: { status: "disposed", reason: typeof body.reason === "string" ? body.reason : null } as unknown as Json
  });

  return ok(data);
}
