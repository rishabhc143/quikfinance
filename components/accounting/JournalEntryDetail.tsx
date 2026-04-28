"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils/currency";

type Line = {
  id: string;
  account_id: string;
  account_name?: string | null;
  account_code?: string | null;
  description?: string | null;
  debit: number;
  credit: number;
};

type JournalEntry = {
  id: string;
  entry_number: string;
  entry_date: string;
  status: string;
  memo?: string | null;
  source_type?: string | null;
  debits: number;
  credits: number;
  line_items: Line[];
};

export function JournalEntryDetail({ id }: { id: string }) {
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/v1/journal-entries/${id}`, { signal: controller.signal });
        const json = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(json.error?.message ?? "Journal entry could not be loaded.");
        setEntry(json.data ?? null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Journal entry could not be loaded.");
      } finally {
        setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [id]);

  if (loading || !entry) {
    return <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading journal entry...</div>;
  }

  const editable = !entry.source_type || entry.source_type === "manual";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{entry.entry_number}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{entry.memo || "Manual journal entry"}</p>
          </div>
          {editable && entry.status !== "posted" ? <Button asChild variant="secondary"><Link href={`/journal-entries/new?edit=${id}`}>Edit</Link></Button> : null}
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <div className="flex justify-between"><span className="text-muted-foreground">Entry date</span><span>{entry.entry_date}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span>{entry.status}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Debits</span><span>{formatMoney(entry.debits)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Credits</span><span>{formatMoney(entry.credits)}</span></div>
          {entry.source_type ? <div className="flex justify-between md:col-span-2"><span className="text-muted-foreground">Source</span><span>{entry.source_type}</span></div> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Journal lines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {entry.line_items.map((line) => (
            <div key={line.id} className="grid gap-2 rounded-lg border p-4 text-sm md:grid-cols-5">
              <div className="font-medium md:col-span-2">{line.account_code ? `${line.account_code} - ` : ""}{line.account_name ?? line.account_id}</div>
              <div>{line.description || "-"}</div>
              <div>Debit: {formatMoney(Number(line.debit ?? 0))}</div>
              <div>Credit: {formatMoney(Number(line.credit ?? 0))}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
