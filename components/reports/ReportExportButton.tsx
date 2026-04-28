"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const handleClick = () => {
    const filenameBase = `${report.key}-${range.from}-to-${range.to}`;
    if (mode === "pdf") {
      const previousTitle = document.title;
      document.title = `${report.title} | ${range.from} to ${range.to}`;
      window.print();
      document.title = previousTitle;
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
    <Button variant="secondary" onClick={handleClick}>
      <Download className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );
}
