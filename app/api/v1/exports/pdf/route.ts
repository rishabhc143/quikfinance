import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { fail } from "@/lib/api/responses";
import { requireApiContext } from "@/lib/api/auth";
import { TabularPdfDocument } from "@/components/pdf/TabularPdfDocument";
import type { PdfExportColumn, PdfExportPayload } from "@/lib/pdf/export";
import { formatPdfSlug, formatPdfText } from "@/lib/pdf/format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function normalizeColumnKind(value: unknown): PdfExportColumn["kind"] {
  return ["text", "money", "number", "status", "date", "boolean"].includes(String(value))
    ? (value as PdfExportColumn["kind"])
    : undefined;
}

function sanitizePayload(value: unknown): PdfExportPayload {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const columns = Array.isArray(record.columns)
    ? record.columns
        .filter((column): column is Record<string, unknown> => !!column && typeof column === "object" && typeof column.key === "string" && typeof column.label === "string")
        .map((column) => ({
          key: String(column.key),
          label: String(column.label),
          kind: normalizeColumnKind(column.kind)
        }))
    : [];

  const rows = Array.isArray(record.rows)
    ? record.rows.filter((row): row is Record<string, unknown> => !!row && typeof row === "object" && !Array.isArray(row))
    : [];

  const normalizeItems = (items: unknown) =>
    Array.isArray(items)
      ? items
          .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
          .map((item) => ({
            label: formatPdfText(item.label),
            value: formatPdfText(item.value)
          }))
      : [];

  const sections = Array.isArray(record.sections)
    ? record.sections
        .filter((section): section is Record<string, unknown> => !!section && typeof section === "object" && typeof section.title === "string")
        .map((section) => ({
          title: String(section.title),
          values: normalizeItems(section.values)
        }))
    : [];

  return {
    title: typeof record.title === "string" && record.title.trim() ? record.title : "QuikFinance Export",
    subtitle: typeof record.subtitle === "string" ? record.subtitle : undefined,
    filenameBase: typeof record.filenameBase === "string" && record.filenameBase.trim() ? record.filenameBase : "quikfinance-export",
    columns,
    rows,
    summary: normalizeItems(record.summary),
    sections,
    totals: normalizeItems(record.totals),
    orientation: record.orientation === "landscape" ? "landscape" : "portrait"
  };
}

export async function POST(request: Request) {
  const auth = await requireApiContext();
  if (!auth.ok) {
    return fail(auth.status, { code: auth.code, message: auth.message });
  }

  const body = await request.json().catch(() => null);
  const payload = sanitizePayload(body);

  if (!payload.columns.length || !payload.rows.length) {
    return fail(422, { code: "INVALID_EXPORT", message: "PDF export requires at least one column and one row." });
  }

  const document = React.createElement(TabularPdfDocument, { payload }) as Parameters<typeof renderToBuffer>[0];
  const buffer = await renderToBuffer(document);
  const filename = `${formatPdfSlug(payload.filenameBase ?? "quikfinance-export")}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
