export type ExtractedLineItem = {
  description: string;
  quantity: number;
  rate: number;
  gst_rate: number;
  discount: number;
  line_total: number;
};

export type ExtractedFields = {
  vendor_name: string | null;
  invoice_number: string | null;
  issue_date: string | null;
  due_date: string | null;
  subtotal: number | null;
  tax_total: number | null;
  total: number | null;
  gstin: string | null;
  line_items: ExtractedLineItem[];
  confidence_score: number;
  warnings: string[];
  duplicate_hint: string | null;
};

function parseMoneyToken(token: string) {
  const normalized = token.replace(/[^0-9.-]/g, "");
  if (!normalized || normalized === "-" || normalized === ".") {
    return null;
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function parseMoney(line: string) {
  const match = line.replace(/[, ]/g, "").match(/-?\d+(?:\.\d{1,2})?/g);
  if (!match || match.length === 0) {
    return null;
  }
  const value = Number(match[match.length - 1]);
  return Number.isFinite(value) ? value : null;
}

function parseDate(line: string) {
  const match = line.match(/(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})/);
  if (!match) {
    return null;
  }
  const parsed = new Date(match[1]);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function textAfterColon(line: string) {
  const [, value] = line.split(/:\s*/, 2);
  return value?.trim() ?? null;
}

function normalizeName(value: string | null) {
  return value?.trim().replace(/\s+/g, " ") || null;
}

function isLikelyLineItem(line: string) {
  const lower = line.toLowerCase();
  if (/(subtotal|grand total|invoice total|bill total|amount due|gst|cgst|sgst|igst|date|invoice|bill|gstin|taxable)/.test(lower)) {
    return false;
  }
  return true;
}

function parseLineItem(line: string): ExtractedLineItem | null {
  if (!isLikelyLineItem(line)) {
    return null;
  }

  const parts = line
    .split(/\t+|\s{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 4) {
    return null;
  }

  const numericParts = parts.map((part) => parseMoneyToken(part));
  const lastThree = numericParts.slice(-3);
  if (lastThree.some((value) => value == null)) {
    return null;
  }

  const [quantity, rate, lineTotal] = lastThree as [number, number, number];
  if (quantity <= 0 || rate < 0 || lineTotal < 0) {
    return null;
  }

  const description = parts.slice(0, -3).join(" ").trim();
  if (!description || description.length < 2) {
    return null;
  }

  return {
    description,
    quantity,
    rate,
    gst_rate: 18,
    discount: 0,
    line_total: Number(lineTotal.toFixed(2))
  };
}

function buildWarnings(fields: Omit<ExtractedFields, "confidence_score" | "warnings" | "duplicate_hint">) {
  const warnings: string[] = [];

  if (!fields.invoice_number) {
    warnings.push("Invoice or bill number was not detected.");
  }
  if (!fields.issue_date) {
    warnings.push("Issue date was not detected.");
  }
  if (fields.total == null || fields.total <= 0) {
    warnings.push("Total amount was not detected confidently.");
  }
  if (fields.line_items.length === 0) {
    warnings.push("No structured line items were detected. Review the draft manually.");
  }
  if (fields.subtotal != null && fields.tax_total != null && fields.total != null) {
    const computed = Number((fields.subtotal + fields.tax_total).toFixed(2));
    if (Math.abs(computed - fields.total) > 1) {
      warnings.push("Subtotal, tax, and total values do not reconcile cleanly.");
    }
  }

  return warnings;
}

function buildConfidence(fields: Omit<ExtractedFields, "confidence_score" | "warnings" | "duplicate_hint">, warnings: string[]) {
  let score = 20;
  if (fields.vendor_name) score += 10;
  if (fields.invoice_number) score += 15;
  if (fields.issue_date) score += 10;
  if (fields.subtotal != null && fields.subtotal > 0) score += 15;
  if (fields.tax_total != null) score += 10;
  if (fields.total != null && fields.total > 0) score += 20;
  if (fields.line_items.length > 0) score += 15;
  score -= warnings.length * 6;
  return Math.max(20, Math.min(98, score));
}

function buildDuplicateHint(fields: { vendor_name: string | null; invoice_number: string | null; issue_date: string | null; total: number | null }) {
  if (!fields.invoice_number || fields.total == null) {
    return null;
  }
  const vendor = normalizeName(fields.vendor_name)?.toLowerCase() ?? "unknown";
  return [vendor, fields.invoice_number.toLowerCase(), fields.issue_date ?? "undated", Number(fields.total).toFixed(2)].join("|");
}

export function extractDocumentFields(sourceText: string): ExtractedFields {
  const lines = sourceText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  let vendorName: string | null = lines[0] ?? null;
  let invoiceNumber: string | null = null;
  let issueDate: string | null = null;
  let dueDate: string | null = null;
  let subtotal: number | null = null;
  let taxTotal: number | null = null;
  let total: number | null = null;
  let gstin: string | null = null;
  const lineItems: ExtractedLineItem[] = [];
  const taxComponents: number[] = [];

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (!invoiceNumber && /(invoice|bill)\s*(no|number|#|id)/.test(lower)) {
      invoiceNumber = textAfterColon(line) ?? line.split(/\s+/).slice(-1)[0] ?? null;
      continue;
    }

    if (!issueDate && /(invoice date|bill date|issue date|date)/.test(lower)) {
      issueDate = parseDate(line);
      continue;
    }

    if (!dueDate && /due date/.test(lower)) {
      dueDate = parseDate(line);
      continue;
    }

    if (!subtotal && /(subtotal|taxable amount|net amount)/.test(lower)) {
      subtotal = parseMoney(line);
      continue;
    }

    if (/(cgst|sgst|igst)/.test(lower)) {
      const componentValue = parseMoney(line);
      if (componentValue != null) {
        taxComponents.push(componentValue);
      }
      continue;
    }

    if (!taxTotal && /(tax total|tax amount)/.test(lower)) {
      taxTotal = parseMoney(line);
      continue;
    }

    if (!total && /(grand total|invoice total|bill total|amount due|total payable)/.test(lower)) {
      total = parseMoney(line);
      continue;
    }

    if (!gstin && /gstin|gst no|gst number/.test(lower)) {
      gstin = textAfterColon(line) ?? line.split(/\s+/).slice(-1)[0] ?? null;
      continue;
    }

    const parsedLine = parseLineItem(line);
    if (parsedLine) {
      lineItems.push(parsedLine);
      continue;
    }

    if (!vendorName && line.length > 3) {
      vendorName = line;
    }
  }

  if (taxComponents.length > 0) {
    const componentTotal = Number(taxComponents.reduce((sum, value) => sum + value, 0).toFixed(2));
    if (taxTotal == null || Math.abs(componentTotal - taxTotal) > 0.5) {
      taxTotal = componentTotal;
    }
  }

  if (!subtotal && lineItems.length > 0) {
    subtotal = Number(lineItems.reduce((sum, line) => sum + line.quantity * line.rate - line.discount, 0).toFixed(2));
  }

  if (!subtotal && total != null && taxTotal != null) {
    subtotal = Math.max(0, total - taxTotal);
  }

  if (!total && subtotal != null && taxTotal != null) {
    total = Number((subtotal + taxTotal).toFixed(2));
  }

  const coreFields = {
    vendor_name: normalizeName(vendorName),
    invoice_number: invoiceNumber,
    issue_date: issueDate,
    due_date: dueDate ?? issueDate,
    subtotal,
    tax_total: taxTotal ?? 0,
    total: total ?? subtotal ?? 0,
    gstin,
    line_items: lineItems
  };
  const warnings = buildWarnings(coreFields);

  return {
    ...coreFields,
    confidence_score: buildConfidence(coreFields, warnings),
    warnings,
    duplicate_hint: buildDuplicateHint(coreFields)
  };
}

