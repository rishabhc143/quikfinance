import type { ApiContext } from "@/lib/api/auth";

type JournalLine = {
  accountId: string;
  debit: number;
  credit: number;
  description?: string | null;
};

type FixedAssetLedgerRow = {
  id: string;
  name: string;
  purchase_cost: number;
  salvage_value: number;
  useful_life_months: number;
  depreciation_method: string;
  accumulated_depreciation: number;
  status: string;
  asset_account_id?: string | null;
  depreciation_expense_account_id?: string | null;
  accumulated_depreciation_account_id?: string | null;
};

function toMoney(value: number) {
  return Number(value.toFixed(2));
}

async function nextEntryNumber(context: ApiContext) {
  const { count, error } = await context.supabase.from("journal_entries").select("id", { count: "exact", head: true }).eq("org_id", context.orgId);
  if (error) throw new Error(error.message);
  return `JE-${String((count ?? 0) + 1).padStart(4, "0")}`;
}

async function applyBalanceDelta(context: ApiContext, lines: JournalLine[]) {
  const byAccount = new Map<string, number>();
  for (const line of lines) {
    const delta = toMoney(Number(line.debit ?? 0) - Number(line.credit ?? 0));
    byAccount.set(line.accountId, toMoney((byAccount.get(line.accountId) ?? 0) + delta));
  }

  for (const [accountId, delta] of byAccount.entries()) {
    const { data: account, error } = await context.supabase.from("accounts").select("balance").eq("org_id", context.orgId).eq("id", accountId).single();
    if (error) throw new Error(error.message);
    const nextBalance = toMoney(Number((account as { balance?: number } | null)?.balance ?? 0) + delta);
    const { error: updateError } = await context.supabase.from("accounts").update({ balance: nextBalance }).eq("org_id", context.orgId).eq("id", accountId);
    if (updateError) throw new Error(updateError.message);
  }
}

async function insertPostedJournal(context: ApiContext, input: { entryDate: string; memo: string; sourceType: string; sourceId: string; lines: JournalLine[] }) {
  const lines = input.lines.filter((line) => line.debit > 0 || line.credit > 0).map((line) => ({ ...line, debit: toMoney(line.debit), credit: toMoney(line.credit) }));
  const debits = toMoney(lines.reduce((sum, line) => sum + line.debit, 0));
  const credits = toMoney(lines.reduce((sum, line) => sum + line.credit, 0));
  if (debits !== credits) throw new Error("Journal entry is not balanced.");

  const entryNumber = await nextEntryNumber(context);
  const { data: journal, error } = await context.supabase
    .from("journal_entries")
    .insert({
      org_id: context.orgId,
      entry_number: entryNumber,
      entry_date: input.entryDate,
      status: "posted",
      memo: input.memo,
      source_type: input.sourceType,
      source_id: input.sourceId,
      created_by: context.userId,
      posted_by: context.userId,
      posted_at: new Date().toISOString()
    })
    .select("id")
    .single();
  if (error || !journal) throw new Error(error?.message ?? "Journal entry could not be created.");

  const { error: lineError } = await context.supabase.from("journal_entry_lines").insert(
    lines.map((line, index) => ({
      org_id: context.orgId,
      journal_entry_id: (journal as { id: string }).id,
      account_id: line.accountId,
      description: line.description ?? null,
      debit: line.debit,
      credit: line.credit,
      display_order: index + 1
    }))
  );
  if (lineError) throw new Error(lineError.message);

  await applyBalanceDelta(context, lines);
  return String((journal as { id: string }).id);
}

async function fetchCategoryId(context: ApiContext, categoryName: string) {
  const table = (context.supabase as unknown as { from: (table: string) => { select: (columns: string) => { eq: (column: string, value: unknown) => { eq: (column: string, value: unknown) => { maybeSingle: () => Promise<{ data: { id?: string } | null; error: { message: string } | null }> } } } } }).from("account_categories");
  const { data, error } = await table.select("id").eq("org_id", context.orgId).eq("name", categoryName).maybeSingle();
  if (error) throw new Error(error.message);
  return typeof data?.id === "string" ? data.id : null;
}

async function findOrCreateAccount(context: ApiContext, input: { code: string; name: string; accountType: string; categoryName: string }) {
  const { data: existing, error: existingError } = await context.supabase
    .from("accounts")
    .select("id")
    .eq("org_id", context.orgId)
    .or(`code.eq.${input.code},name.eq.${input.name}`)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (typeof existing?.id === "string") return existing.id;

  const categoryId = await fetchCategoryId(context, input.categoryName);
  const { data, error } = await context.supabase
    .from("accounts")
    .insert({
      org_id: context.orgId,
      category_id: categoryId,
      code: input.code,
      name: input.name,
      account_type: input.accountType,
      currency: "INR",
      is_active: true,
      is_system: true,
      balance: 0
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? `Account ${input.name} could not be created.`);
  return String((data as { id: string }).id);
}

async function resolveBankOrCashAccount(context: ApiContext, bankAccountId?: string | null) {
  if (bankAccountId) {
    const { data } = await context.supabase.from("bank_accounts").select("account_id").eq("org_id", context.orgId).eq("id", bankAccountId).maybeSingle();
    if (typeof data?.account_id === "string") return data.account_id;
  }
  return findOrCreateAccount(context, { code: "1000", name: "Operating Bank", accountType: "bank", categoryName: "Assets" });
}

async function resolveAssetAccounts(context: ApiContext, asset: FixedAssetLedgerRow) {
  return {
    assetAccountId: typeof asset.asset_account_id === "string" && asset.asset_account_id ? asset.asset_account_id : await findOrCreateAccount(context, { code: "1500", name: "Fixed Assets", accountType: "fixed_asset", categoryName: "Assets" }),
    depreciationExpenseAccountId:
      typeof asset.depreciation_expense_account_id === "string" && asset.depreciation_expense_account_id
        ? asset.depreciation_expense_account_id
        : await findOrCreateAccount(context, { code: "6050", name: "Depreciation Expense", accountType: "expense", categoryName: "Expenses" }),
    accumulatedDepreciationAccountId:
      typeof asset.accumulated_depreciation_account_id === "string" && asset.accumulated_depreciation_account_id
        ? asset.accumulated_depreciation_account_id
        : await findOrCreateAccount(context, { code: "1510", name: "Accumulated Depreciation", accountType: "contra_asset", categoryName: "Assets" }),
    disposalGainAccountId: await findOrCreateAccount(context, { code: "4200", name: "Gain on Asset Disposal", accountType: "other_income", categoryName: "Revenue" }),
    disposalLossAccountId: await findOrCreateAccount(context, { code: "6950", name: "Loss on Asset Disposal", accountType: "expense", categoryName: "Expenses" })
  };
}

export async function postFixedAssetDepreciation(context: ApiContext, asset: FixedAssetLedgerRow, input: { months: number; entryDate: string }) {
  const purchaseCost = Number(asset.purchase_cost ?? 0);
  const salvageValue = Number(asset.salvage_value ?? 0);
  const usefulLifeMonths = Math.max(Number(asset.useful_life_months ?? 1), 1);
  const accumulated = Number(asset.accumulated_depreciation ?? 0);
  const remainingBase = Math.max(0, purchaseCost - salvageValue - accumulated);
  const monthly = String(asset.depreciation_method) === "declining_balance"
    ? Number(((Math.max(purchaseCost - accumulated, 0) * 0.2) / 12).toFixed(2))
    : Number(((purchaseCost - salvageValue) / usefulLifeMonths).toFixed(2));
  const depreciationAmount = Math.min(remainingBase, Number((monthly * input.months).toFixed(2)));
  const nextAccumulated = Number((accumulated + depreciationAmount).toFixed(2));
  const accounts = await resolveAssetAccounts(context, asset);

  const journalEntryId = await insertPostedJournal(context, {
    entryDate: input.entryDate,
    memo: `Depreciation for ${asset.name}`,
    sourceType: "fixed_asset_depreciation",
    sourceId: asset.id,
    lines: [
      { accountId: accounts.depreciationExpenseAccountId, debit: depreciationAmount, credit: 0, description: `Depreciation expense for ${asset.name}` },
      { accountId: accounts.accumulatedDepreciationAccountId, debit: 0, credit: depreciationAmount, description: `Accumulated depreciation for ${asset.name}` }
    ]
  });

  const { data: updatedAsset, error: updateError } = await context.supabase
    .from("fixed_assets")
    .update({ accumulated_depreciation: nextAccumulated })
    .eq("org_id", context.orgId)
    .eq("id", asset.id)
    .select("*")
    .single();
  if (updateError || !updatedAsset) throw new Error(updateError?.message ?? "Fixed asset could not be updated.");

  const entryDate = new Date(input.entryDate);
  const periodStart = new Date(entryDate.getFullYear(), entryDate.getMonth(), 1).toISOString().slice(0, 10);
  const periodEnd = new Date(entryDate.getFullYear(), entryDate.getMonth() + 1, 0).toISOString().slice(0, 10);
  await context.supabase.from("depreciation_entries").insert({
    org_id: context.orgId,
    fixed_asset_id: asset.id,
    period_start: periodStart,
    period_end: periodEnd,
    amount: depreciationAmount,
    journal_entry_id: journalEntryId,
    posted_at: new Date().toISOString()
  });

  return { asset: updatedAsset, depreciationAmount, nextAccumulated, journalEntryId };
}

export async function postFixedAssetDisposal(context: ApiContext, asset: FixedAssetLedgerRow, input: { disposalAmount: number; disposalDate: string; bankAccountId?: string | null }) {
  const accounts = await resolveAssetAccounts(context, asset);
  const bookValue = Math.max(0, Number(asset.purchase_cost ?? 0) - Number(asset.accumulated_depreciation ?? 0));
  const proceeds = toMoney(Number(input.disposalAmount ?? 0));
  const bankOrCashAccountId = await resolveBankOrCashAccount(context, input.bankAccountId);
  const gain = proceeds > bookValue ? toMoney(proceeds - bookValue) : 0;
  const loss = bookValue > proceeds ? toMoney(bookValue - proceeds) : 0;

  const lines: JournalLine[] = [
    { accountId: accounts.accumulatedDepreciationAccountId, debit: toMoney(Number(asset.accumulated_depreciation ?? 0)), credit: 0, description: `Reverse accumulated depreciation for ${asset.name}` },
    { accountId: accounts.assetAccountId, debit: 0, credit: toMoney(Number(asset.purchase_cost ?? 0)), description: `Dispose asset ${asset.name}` }
  ];
  if (proceeds > 0) lines.push({ accountId: bankOrCashAccountId, debit: proceeds, credit: 0, description: `Disposal proceeds for ${asset.name}` });
  if (gain > 0) lines.push({ accountId: accounts.disposalGainAccountId, debit: 0, credit: gain, description: `Gain on disposal for ${asset.name}` });
  if (loss > 0) lines.push({ accountId: accounts.disposalLossAccountId, debit: loss, credit: 0, description: `Loss on disposal for ${asset.name}` });

  const journalEntryId = await insertPostedJournal(context, {
    entryDate: input.disposalDate,
    memo: `Disposal of ${asset.name}`,
    sourceType: "fixed_asset_disposal",
    sourceId: asset.id,
    lines
  });

  const { data: updatedAsset, error: updateError } = await context.supabase
    .from("fixed_assets")
    .update({ status: "disposed", disposal_date: input.disposalDate, disposal_amount: proceeds })
    .eq("org_id", context.orgId)
    .eq("id", asset.id)
    .select("*")
    .single();
  if (updateError || !updatedAsset) throw new Error(updateError?.message ?? "Fixed asset could not be updated.");

  return { asset: updatedAsset, journalEntryId, proceeds, gain, loss };
}

