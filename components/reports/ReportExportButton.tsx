"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReportConfig } from "@/lib/reports";

function csvEscape(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export function ReportExportButton({ label, mode, report }: { label: string; mode: "pdf" | "csv"; report: ReportConfig }) {
  const handleClick = () => {
    if (mode === "pdf") {
      window.print();
      return;
    }

    const header = report.columns.map((column) => csvEscape(column.label)).join(",");
    const body = report.rows.map((row) => report.columns.map((column) => csvEscape(row[column.key])).join(",")).join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${report.key}.csv`;
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
