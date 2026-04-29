import { parseStructuredText, pickField } from "./csv";

export type PreviewEntityType = "customers" | "vendors" | "invoices" | "bills" | "payments" | "bank_transactions" | "trial_balance";

export type ImportPreviewSummary = {
  totalRows: number;
  columns: string[];
  sampleRows: Record<string, string>[];
  warnings: string[];
  readiness: "ready" | "review" | "failed";
};

const requiredAliases: Record<PreviewEntityType, string[][]> = {
  customers: [["display_name", "name", "customer_name"]],
  vendors: [["display_name", "name", "vendor_name"]],
  invoices: [["invoice_number", "invoice_no", "voucher_number"], ["amount", "total", "grand_total"]],
  bills: [["bill_number", "reference", "voucher_number"], ["amount", "total", "grand_total"]],
  payments: [["amount", "payment_amount", "received_amount", "paid_amount"], ["date", "payment_date"]],
  bank_transactions: [["date", "transaction_date", "value_date"], ["description", "particulars", "narration"]],
  trial_balance: [["account", "account_name", "ledger_name"], ["balance", "closing_balance", "amount"]]
};

function evaluateRow(row: Record<string, string>, aliasSets: string[][]) {
  return aliasSets.filter((aliases) => !pickField(row, aliases)).length;
}

export function analyzeImportPayload(entityType: PreviewEntityType, payloadText: string): ImportPreviewSummary {
  const rows = parseStructuredText(payloadText);
  if (rows.length === 0) {
    return {
      totalRows: 0,
      columns: [],
      sampleRows: [],
      warnings: ["No importable rows were found. Use CSV with a header row or a JSON array."],
      readiness: "failed"
    };
  }

  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const aliasSets = requiredAliases[entityType] ?? [];
  const missingFieldRows = rows.reduce((sum, row) => sum + (evaluateRow(row, aliasSets) > 0 ? 1 : 0), 0);
  const warnings: string[] = [];

  if (missingFieldRows > 0) {
    warnings.push(`${missingFieldRows} row(s) are missing one or more required fields for ${entityType.replaceAll("_", " ")}.`);
  }

  if (columns.length < 2) {
    warnings.push("The payload has too few columns to be safely mapped.");
  }

  const readiness = rows.length === 0 ? "failed" : warnings.length === 0 ? "ready" : missingFieldRows === rows.length ? "failed" : "review";

  return {
    totalRows: rows.length,
    columns,
    sampleRows: rows.slice(0, 5),
    warnings,
    readiness
  };
}

