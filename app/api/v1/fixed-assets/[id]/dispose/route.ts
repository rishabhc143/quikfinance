import { NextRequest } from "next/server";
import { canWriteData, requireApiContext } from "@/lib/api/auth";
import { fail, ok } from "@/lib/api/responses";
import { postFixedAssetDisposal } from "@/lib/accounting/fixed-assets";
import type { Json } from "@/types/database.types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });
  if (!canWriteData(auth.context.role)) {
    return fail(403, { code: "READ_ONLY_ROLE", message: "Your role has read-only access." });
  }

  const body = await request.json().catch(() => ({}));
  const disposalAmount = Math.max(Number(body.disposal_amount ?? 0), 0);
  const disposalDate = typeof body.disposal_date === "string" && body.disposal_date ? body.disposal_date : new Date().toISOString().slice(0, 10);
  const bankAccountId = typeof body.bank_account_id === "string" ? body.bank_account_id : null;

  const { data: asset, error: assetError } = await auth.context.supabase
    .from("fixed_assets")
    .select("id, name, purchase_cost, salvage_value, useful_life_months, depreciation_method, accumulated_depreciation, status, asset_account_id, depreciation_expense_account_id, accumulated_depreciation_account_id")
    .eq("org_id", auth.context.orgId)
    .eq("id", params.id)
    .single();

  if (assetError || !asset) {
    return fail(404, { code: "NOT_FOUND", message: "Fixed asset was not found." });
  }
  if (String(asset.status) === "disposed") {
    return fail(422, { code: "INVALID_STATUS", message: "This asset is already disposed." });
  }

  try {
    const result = await postFixedAssetDisposal(auth.context, asset as never, { disposalAmount, disposalDate, bankAccountId });

    await auth.context.supabase.from("audit_logs").insert({
      org_id: auth.context.orgId,
      user_id: auth.context.userId,
      action: "dispose",
      entity_type: "fixed_asset",
      entity_id: params.id,
      new_values: { disposal_amount: disposalAmount, disposal_date: disposalDate, journal_entry_id: result.journalEntryId, gain: result.gain, loss: result.loss } as unknown as Json
    });

    return ok({ asset: result.asset, journal_entry_id: result.journalEntryId, gain: result.gain, loss: result.loss, proceeds: result.proceeds });
  } catch (error) {
    return fail(400, { code: "UPDATE_FAILED", message: error instanceof Error ? error.message : "Asset disposal could not be posted." });
  }
}
