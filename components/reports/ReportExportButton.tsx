"use client";

import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { downloadPdfExport } from "@/lib/pdf/client";
import { formatPdfMoney, formatPdfNumber } from "@/lib/pdf/format";
import type { ReportConfig } from "@/lib/reports";

function csvEscape(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export function ReportExportButton({
  label,
  mode,
  report,
  range
}: {
  label: string;
  mode: "pdf" | "csv";
  report: ReportConfig;
  range: { from: string; to: string };
}) {
  const handleClick = async () => {
    const filenameBase = `${report.key}-${range.from}-to-${range.to}`;
    if (mode === "pdf") {
      try {
        await downloadPdfExport({
          title: report.title,
          subtitle: `${report.description} | ${range.from} to ${range.to}`,
          filenameBase,
          orientation: report.columns.length > 5 ? "landscape" : "portrait",
          columns: report.columns.map((column) => ({
            key: column.key,
            label: column.label,
            kind: column.kind
          })),
          rows: report.rows,
          summary: report.summary.map((item) => ({
            label: item.label,
            value: item.kind === "number"
              ? formatPdfNumber(item.value)
              : item.kind === "percent"
                ? `${item.value}%`
                : formatPdfMoney(item.value)
          })),
          sections: report.sections?.map((section) => ({
            title: section.label,
            values: [
              { label: "Taxable value", value: formatPdfMoney(section.taxable_value) },
              { label: "Tax amount", value: formatPdfMoney(section.tax_amount) },
              { label: "Documents", value: formatPdfNumber(section.documents) }
            ]
          })),
          totals: report.totals
            ? Object.entries(report.totals).map(([key, value]) => ({
                label: key.replaceAll("_", " "),
                value: formatPdfMoney(value)
              }))
            : []
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "PDF export failed.");
      }
      return;
    }

    const header = report.columns.map((column) => csvEscape(column.label)).join(",");
    const body = report.rows.map((row) => report.columns.map((column) => csvEscape(row[column.key])).join(",")).join("\n");
    const summary = report.summary.length
      ? `Summary\n${report.summary.map((item) => `${csvEscape(item.label)},${csvEscape(item.value)}`).join("\n")}\n\n`
      : "";
    const blob = new Blob([`${summary}${header}\n${body}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filenameBase}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="secondary" onClick={() => void handleClick()}>
      <Download className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );
}
