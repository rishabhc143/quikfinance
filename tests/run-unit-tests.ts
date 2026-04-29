import assert from "node:assert/strict";
import { extractDocumentFields } from "../lib/ocr/parser";
import { applyStockMovement, movementDelta, validateStockMovement } from "../lib/inventory/stock-control";
import { buildStockMovementJournalLines, reverseStockMovementJournalLines, stockMovementValue } from "../lib/inventory/stock-accounting";
import { analyzeImportPayload } from "../lib/imports/preview";

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

const item = {
  id: "item-1",
  sku: "SKU-001",
  name: "Widget",
  quantity_on_hand: 10,
  reorder_point: 4,
  purchase_price: 125
};

run("OCR parser extracts structured fields and line items", () => {
  const fields = extractDocumentFields([
    "Metro Cloud Hosting Pvt Ltd",
    "Invoice No: INV-2026-041",
    "Invoice Date: 2026-04-28",
    "GSTIN: 22AAAAA0000A1Z5",
    "Cloud subscription    2    1500    3000",
    "Support retainer    1    500    500",
    "Subtotal: 3500",
    "CGST: 315",
    "SGST: 315",
    "Grand Total: 4130"
  ].join("\n"));

  assert.equal(fields.vendor_name, "Metro Cloud Hosting Pvt Ltd");
  assert.equal(fields.invoice_number, "INV-2026-041");
  assert.equal(fields.issue_date, "2026-04-28");
  assert.equal(fields.subtotal, 3500);
  assert.equal(fields.tax_total, 630);
  assert.equal(fields.total, 4130);
  assert.equal(fields.line_items.length, 2);
  assert.ok(fields.confidence_score >= 80);
  assert.equal(fields.warnings.length, 0);
  assert.match(fields.duplicate_hint ?? "", /inv-2026-041/i);
});

run("OCR parser emits review warnings for incomplete OCR text", () => {
  const fields = extractDocumentFields([
    "Vendor Name",
    "Random OCR text with no totals",
    "Another line without a number"
  ].join("\n"));

  assert.ok(fields.warnings.some((warning) => warning.includes("Invoice or bill number")));
  assert.ok(fields.warnings.some((warning) => warning.includes("Total amount")));
  assert.ok(fields.confidence_score < 70);
});

run("Stock movement delta rules stay consistent", () => {
  assert.equal(movementDelta("receipt", 5), 5);
  assert.equal(movementDelta("issue", 5), -5);
  assert.equal(movementDelta("dispatch", 3), -3);
  assert.equal(movementDelta("transfer", 8), 0);
  assert.equal(movementDelta("adjustment", -2), -2);
});

run("Stock validation blocks negative inventory issues", () => {
  const validation = validateStockMovement({
    item,
    movement: {
      item_id: item.id,
      warehouse_id: "warehouse-1",
      movement_type: "issue",
      quantity: 12,
      unit_cost: 125
    }
  });

  assert.equal(validation.ok, false);
  assert.ok(validation.errors[0]?.includes("Insufficient stock"));
});

run("Applying stock movements updates quantity and low-stock state", () => {
  const receipt = applyStockMovement(item, {
    item_id: item.id,
    warehouse_id: "warehouse-1",
    movement_type: "receipt",
    quantity: 5,
    unit_cost: 125
  });
  assert.equal(receipt.quantityOnHand, 15);
  assert.equal(receipt.lowStock, false);

  const issue = applyStockMovement(item, {
    item_id: item.id,
    warehouse_id: "warehouse-1",
    movement_type: "issue",
    quantity: 6,
    unit_cost: 125
  });
  assert.equal(issue.quantityOnHand, 4);
  assert.equal(issue.lowStock, true);
});

run("Stock movement accounting builds balanced receipt and issue journals", () => {
  const receiptLines = buildStockMovementJournalLines({
    movementType: "receipt",
    quantity: 2,
    unitCost: 150,
    itemLabel: "Widget"
  });
  assert.equal(stockMovementValue(2, 150), 300);
  assert.equal(receiptLines.length, 2);
  assert.equal(receiptLines[0]?.accountCode, "1200");
  assert.equal(receiptLines[1]?.accountCode, "2000");
  assert.equal(receiptLines.reduce((sum, line) => sum + line.debit, 0), receiptLines.reduce((sum, line) => sum + line.credit, 0));

  const issueLines = buildStockMovementJournalLines({
    movementType: "issue",
    quantity: 3,
    unitCost: 80,
    itemLabel: "Widget"
  });
  assert.equal(issueLines[0]?.accountCode, "5000");
  assert.equal(issueLines[1]?.accountCode, "1200");
  const reversal = reverseStockMovementJournalLines(issueLines);
  assert.equal(reversal[0]?.debit, issueLines[0]?.credit);
  assert.equal(reversal[0]?.credit, issueLines[0]?.debit);
});

run("Import preview analyzes payload readiness and missing required fields", () => {
  const readyPreview = analyzeImportPayload(
    "customers",
    ["display_name,email", "Acme Labs,ops@acme.test", "Northwind,finance@northwind.test"].join("\n")
  );
  assert.equal(readyPreview.totalRows, 2);
  assert.equal(readyPreview.readiness, "ready");
  assert.equal(readyPreview.warnings.length, 0);

  const failedPreview = analyzeImportPayload(
    "payments",
    ["memo,reference", "Missing amount and date,ABC123"].join("\n")
  );
  assert.equal(failedPreview.readiness, "failed");
  assert.ok(failedPreview.warnings[0]?.includes("missing"));
});

