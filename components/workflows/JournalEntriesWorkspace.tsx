"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import type { TableRow } from "@/lib/modules";
import { formatMoney } from "@/lib/utils/currency";

const columns = [
  { key: "entry_number", label: "Entry" },
  { key: "entry_date", label: "Date", kind: "date" as const },
  { key: "memo", label: "Memo" },
  { key: "debits", label: "Debits", kind: "money" as const, align: "right" as const },
  { key: "credits", label: "Credits", kind: "money" as const, align: "right" as const },
  { key: "status", label: "Status", kind: "status" as const }
];

export function JournalEntriesWorkspace() {
  const [rows, setRows] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/v1/journal-entries?per_page=50", { signal: controller.signal, cache: "no-store" });
        const json = await response.json().catch(() => ({ data: [] }));
        setRows(Array.isArray(json.data) ? json.data : []);
      } finally {
        setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, []);

  const summary = useMemo(() => {
    const posted = rows.filter((row) => String(row.status ?? "") === "posted").length;
    const draft = rows.filter((row) => String(row.status ?? "") === "draft").length;
    const debits = rows.reduce((sum, row) => sum + Number(row.debits ?? 0), 0);
    return { posted, draft, debits };
  }, [rows]);

  return (
    <div className="space-y-6">
      <PageHeader title="Journal Entries" description="Review manual and system journals, check control-account movement, and post balanced adjustments." actionLabel="New entry" actionHref="/journal-entries/new" />
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle>Posted journals</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.posted}</CardContent></Card>
        <Card><CardHeader><CardTitle>Draft / review</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.draft}</CardContent></Card>
        <Card>
          <CardHeader><CardTitle>Debit volume</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="text-2xl font-bold">{formatMoney(summary.debits)}</div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="secondary"><Link href="/day-book">Day book</Link></Button>
              <Button asChild variant="secondary"><Link href="/ledgers">Ledgers</Link></Button>
            </div>
          </CardContent>
        </Card>
      </div>
      {loading ? <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading journal entries...</div> : rows.length ? <DataTable columns={columns} rows={rows} title="Journal Entries" getRowHref={(row) => `/journal-entries/${row.id}`} /> : <EmptyState title="No journal entries yet" description="Create a manual journal when you need accruals, adjustments, or control-account corrections outside normal transactions." actionLabel="New entry" actionHref="/journal-entries/new" />}
    </div>
  );
}
