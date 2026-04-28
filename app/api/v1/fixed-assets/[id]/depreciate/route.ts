import { NextRequest } from "next/server";
import { canWriteData, requireApiContext } from "@/lib/api/auth";
import { fail, ok } from "@/lib/api/responses";
import { postFixedAssetDepreciation } from "@/lib/accounting/fixed-assets";
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
  const entryDate = typeof body.entry_date === "string" && body.entry_date ? body.entry_date : new Date().toISOString().slice(0, 10);

  const { data: asset, error: assetError } = await auth.context.supabase
    .from("fixed_assets")
    .select("id, name, purchase_cost, salvage_value, useful_life_months, depreciation_method, accumulated_depreciation, status, asset_account_id, depreciation_expense_account_id, accumulated_depreciation_account_id")
    .eq("org_id", auth.context.orgId)
    .eq("id", params.id)
    .single();

  if (assetError || !asset) {
    return fail(404, { code: "NOT_FOUND", message: "Fixed asset was not found." });
  }

  if (String(asset.status) !== "active") {
    return fail(422, { code: "INVALID_STATUS", message: "Only active assets can be depreciated." });
  }

  try {
    const result = await postFixedAssetDepreciation(auth.context, asset as never, { months, entryDate });

    await auth.context.supabase.from("audit_logs").insert({
      org_id: auth.context.orgId,
      user_id: auth.context.userId,
      action: "depreciate",
      entity_type: "fixed_asset",
      entity_id: params.id,
      new_values: { months, entry_date: entryDate, depreciation_amount: result.depreciationAmount, accumulated_depreciation: result.nextAccumulated, journal_entry_id: result.journalEntryId } as unknown as Json
    });

    return ok({ asset: result.asset, depreciation_amount: result.depreciationAmount, months, journal_entry_id: result.journalEntryId });
  } catch (error) {
    return fail(400, { code: "UPDATE_FAILED", message: error instanceof Error ? error.message : "Depreciation could not be posted." });
  }
}
