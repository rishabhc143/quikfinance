"use client";

import { ArrowDown, ArrowUp, Download, EyeOff } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckboxCell } from "@/components/shared/Selection";
import { SearchBar } from "@/components/shared/SearchBar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatMoney } from "@/lib/utils/currency";
import type { DataColumn, TableRow, TableValue } from "@/lib/modules";
import { cn } from "@/lib/utils/cn";

function renderValue(value: TableValue, column: DataColumn) {
  if (value === null || value === undefined) {
    return "-";
  }
  if (column.kind === "money" && typeof value === "number") {
    return formatMoney(value);
  }
  if (column.kind === "status" && typeof value === "string") {
    return <StatusBadge status={value} />;
  }
  if (column.kind === "boolean" && typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  return String(value);
}

function compareValues(a: TableValue, b: TableValue) {
  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }
  return String(a ?? "").localeCompare(String(b ?? ""));
}

function csvEscape(value: TableValue) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export function DataTable({ columns, rows, title }: { columns: DataColumn[]; rows: TableRow[]; title: string }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState(columns[0]?.key ?? "id");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  const visibleColumns = columns.filter((column) => !hiddenColumns.includes(column.key));

  const filteredRows = useMemo(() => {
    const lowered = search.toLowerCase();
    return rows
      .filter((row) => Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(lowered)))
      .sort((a, b) => {
        const result = compareValues(a[sortKey], b[sortKey]);
        return direction === "asc" ? result : -result;
      });
  }, [rows, search, sortKey, direction]);

  const totalPages = Math.max(Math.ceil(filteredRows.length / pageSize), 1);
  const pageRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  const exportCsv = () => {
    const header = visibleColumns.map((column) => csvEscape(column.label)).join(",");
    const body = filteredRows.map((row) => visibleColumns.map((column) => csvEscape(row[column.key])).join(",")).join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.toLowerCase().replaceAll(" ", "-")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setDirection(direction === "asc" ? "desc" : "asc");
      return;
    }
    setSortKey(key);
    setDirection("asc");
  };

  const allPageSelected = pageRows.length > 0 && pageRows.every((row) => selected.includes(row.id));

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
        <SearchBar value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder={`Search ${title.toLowerCase()}`} />
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(1);
            }}
            className="h-10 rounded-md border bg-background px-3 text-sm"
            aria-label="Rows per page"
          >
            {[10, 25, 50].map((size) => (
              <option key={size} value={size}>
                {size} rows
              </option>
            ))}
          </select>
          <Button variant="secondary" onClick={exportCsv}>
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          {columns.length > 4 ? (
            <Button
              variant="ghost"
              onClick={() => setHiddenColumns((current) => (current.includes(columns.at(-1)?.key ?? "") ? [] : [columns.at(-1)?.key ?? ""]))}
            >
              <EyeOff className="mr-2 h-4 w-4" />
              Columns
            </Button>
          ) : null}
        </div>
      </div>
      {selected.length > 0 ? <div className="border-b bg-muted/60 px-4 py-2 text-sm font-medium">{selected.length} selected for bulk actions</div> : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] table-fixed text-sm">
          <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="w-12 px-4 py-3 text-left">
                <CheckboxCell
                  checked={allPageSelected}
                  onChange={(checked) => {
                    const ids = pageRows.map((row) => row.id);
                    setSelected((current) => (checked ? Array.from(new Set([...current, ...ids])) : current.filter((id) => !ids.includes(id))));
                  }}
                />
              </th>
              {visibleColumns.map((column) => (
                <th key={column.key} className={cn("px-4 py-3", column.align === "right" ? "text-right" : "text-left")}>
                  <button type="button" onClick={() => toggleSort(column.key)} className="inline-flex items-center gap-1 font-semibold">
                    {column.label}
                    {sortKey === column.key ? direction === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" /> : null}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr key={row.id} className="border-t transition hover:bg-muted/40">
                <td className="px-4 py-3">
                  <CheckboxCell
                    checked={selected.includes(row.id)}
                    onChange={(checked) =>
                      setSelected((current) => (checked ? [...current, row.id] : current.filter((id) => id !== row.id)))
                    }
                  />
                </td>
                {visibleColumns.map((column) => (
                  <td key={column.key} className={cn("truncate px-4 py-3", column.align === "right" ? "text-right tabular-nums" : "text-left")}>
                    {renderValue(row[column.key], column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t p-4 text-sm text-muted-foreground">
        <span>
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((current) => Math.max(current - 1, 1))}>
            Previous
          </Button>
          <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(current + 1, totalPages))}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
