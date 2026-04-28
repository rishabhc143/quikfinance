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
  const months = Math.max(Number(body.months ?? 1), 1);

  const { data: asset, error: assetError } = await auth.context.supabase
    .from("fixed_assets")
    .select("id, name, purchase_cost, salvage_value, useful_life_months, depreciation_method, accumulated_depreciation, status")
    .eq("org_id", auth.context.orgId)
    .eq("id", params.id)
    .single();

  if (assetError || !asset) {
    return fail(404, { code: "NOT_FOUND", message: "Fixed asset was not found." });
  }

  if (String(asset.status) !== "active") {
    return fail(422, { code: "INVALID_STATUS", message: "Only active assets can be depreciated." });
  }

  const purchaseCost = Number(asset.purchase_cost ?? 0);
  const salvageValue = Number(asset.salvage_value ?? 0);
  const usefulLifeMonths = Math.max(Number(asset.useful_life_months ?? 1), 1);
  const accumulated = Number(asset.accumulated_depreciation ?? 0);
  const remainingBase = Math.max(0, purchaseCost - salvageValue - accumulated);
  const monthly = String(asset.depreciation_method) === "declining_balance"
    ? Number(((Math.max(purchaseCost - accumulated, 0) * 0.2) / 12).toFixed(2))
    : Number(((purchaseCost - salvageValue) / usefulLifeMonths).toFixed(2));
  const depreciationAmount = Math.min(remainingBase, Number((monthly * months).toFixed(2)));
  const nextAccumulated = Number((accumulated + depreciationAmount).toFixed(2));

  const { data, error } = await auth.context.supabase
    .from("fixed_assets")
    .update({ accumulated_depreciation: nextAccumulated })
    .eq("org_id", auth.context.orgId)
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) {
    return fail(400, { code: "UPDATE_FAILED", message: error.message });
  }

  await auth.context.supabase.from("audit_logs").insert({
    org_id: auth.context.orgId,
    user_id: auth.context.userId,
    action: "depreciate",
    entity_type: "fixed_asset",
    entity_id: params.id,
    new_values: { months, depreciation_amount: depreciationAmount, accumulated_depreciation: nextAccumulated } as unknown as Json
  });

  return ok({ asset: data, depreciation_amount: depreciationAmount, months });
}
