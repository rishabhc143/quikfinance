import type { StockMovementType } from "@/lib/inventory/stock-control";

export type StockMovementJournalLine = {
  accountCode: "1200" | "2000" | "5000" | "6000";
  debit: number;
  credit: number;
  description: string;
};

export function stockMovementValue(quantity: number, unitCost: number) {
  const value = Number(quantity) * Number(unitCost);
  return Number.isFinite(value) ? Number(value.toFixed(2)) : 0;
}

export function buildStockMovementJournalLines(input: {
  movementType: StockMovementType;
  quantity: number;
  unitCost: number;
  itemLabel: string;
  reason?: string | null;
}): StockMovementJournalLine[] {
  const amount = stockMovementValue(input.quantity, input.unitCost);
  if (amount <= 0 || input.movementType === "transfer") {
    return [] satisfies StockMovementJournalLine[];
  }

  const itemLabel = input.itemLabel || "inventory item";
  const reasonSuffix = input.reason ? ` (${input.reason})` : "";

  switch (input.movementType) {
    case "receipt":
      return [
        { accountCode: "1200", debit: amount, credit: 0, description: `Inventory receipt ${itemLabel}${reasonSuffix}` },
        { accountCode: "2000", debit: 0, credit: amount, description: `Inventory receipt accrual ${itemLabel}${reasonSuffix}` }
      ];
    case "issue":
    case "dispatch":
      return [
        { accountCode: "5000", debit: amount, credit: 0, description: `Inventory issue ${itemLabel}${reasonSuffix}` },
        { accountCode: "1200", debit: 0, credit: amount, description: `Inventory reduction ${itemLabel}${reasonSuffix}` }
      ];
    case "adjustment":
      if (Number(input.quantity) > 0) {
        return [
          { accountCode: "1200", debit: amount, credit: 0, description: `Inventory gain ${itemLabel}${reasonSuffix}` },
          { accountCode: "6000", debit: 0, credit: amount, description: `Inventory adjustment gain ${itemLabel}${reasonSuffix}` }
        ];
      }
      return [
        { accountCode: "6000", debit: amount, credit: 0, description: `Inventory adjustment loss ${itemLabel}${reasonSuffix}` },
        { accountCode: "1200", debit: 0, credit: amount, description: `Inventory loss ${itemLabel}${reasonSuffix}` }
      ];
    default:
      return [] satisfies StockMovementJournalLine[];
  }
}

export function reverseStockMovementJournalLines(lines: StockMovementJournalLine[]) {
  return lines.map((line) => ({
    ...line,
    debit: line.credit,
    credit: line.debit,
    description: `Reversal: ${line.description}`
  }));
}

