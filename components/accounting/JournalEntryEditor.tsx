"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/utils/currency";
import { todayISO } from "@/lib/utils/dates";

type AccountOption = { id: string; code?: string | null; name: string };
type JournalLine = { account_id: string; description: string; debit: number; credit: number };

function emptyLine(): JournalLine {
  return { account_id: "", description: "", debit: 0, credit: 0 };
}

function toMoney(value: number) {
  return Number(value.toFixed(2));
}

export function JournalEntryEditor() {
  const router = useRouter();
  const [editId, setEditId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [entryNumber, setEntryNumber] = useState("");
  const [entryDate, setEntryDate] = useState(todayISO());
  const [status, setStatus] = useState("draft");
  const [memo, setMemo] = useState("");
  const [lines, setLines] = useState<JournalLine[]>([emptyLine(), emptyLine()]);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    setEditId(search.get("edit"));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const boot = async () => {
      setLoading(true);
      try {
        const [accountsRes, entryRes] = await Promise.all([
          fetch("/api/v1/accounts", { signal: controller.signal }),
          editId ? fetch(`/api/v1/journal-entries/${editId}`, { signal: controller.signal }) : Promise.resolve(null)
        ]);
        const accountsJson = await accountsRes.json().catch(() => ({ data: [] }));
        setAccounts(Array.isArray(accountsJson.data) ? accountsJson.data : []);

        if (entryRes) {
          const entryJson = await entryRes.json().catch(() => ({}));
          if (!entryRes.ok) throw new Error(entryJson.error?.message ?? "Journal entry could not be loaded.");
          const entry = entryJson.data ?? {};
          setEntryNumber(String(entry.entry_number ?? ""));
          setEntryDate(String(entry.entry_date ?? todayISO()));
          setStatus(String(entry.status ?? "draft"));
          setMemo(String(entry.memo ?? ""));
          setLines(
            Array.isArray(entry.line_items) && entry.line_items.length
              ? entry.line_items.map((line: Record<string, unknown>) => ({
                  account_id: String(line.account_id ?? ""),
                  description: String(line.description ?? ""),
                  debit: Number(line.debit ?? 0),
                  credit: Number(line.credit ?? 0)
                }))
              : [emptyLine(), emptyLine()]
          );
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Journal entry could not be loaded.");
      } finally {
        setLoading(false);
      }
    };
    void boot();
    return () => controller.abort();
  }, [editId]);

  const totals = useMemo(() => {
    const debits = toMoney(lines.reduce((sum, line) => sum + Number(line.debit ?? 0), 0));
    const credits = toMoney(lines.reduce((sum, line) => sum + Number(line.credit ?? 0), 0));
    return { debits, credits, balanced: debits === credits };
  }, [lines]);

  const updateLine = (index: number, patch: Partial<JournalLine>) => {
    setLines((current) => current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)));
  };

  const submit = async () => {
    const validLines = lines.filter((line) => line.account_id && (line.debit > 0 || line.credit > 0));
    if (validLines.length < 2) {
      toast.error("Add at least two journal lines.");
      return;
    }
    if (!totals.balanced) {
      toast.error("Debits and credits must match before saving.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(editId ? `/api/v1/journal-entries/${editId}` : "/api/v1/journal-entries", {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entry_number: entryNumber || undefined,
          entry_date: entryDate,
          status,
          memo: memo || null,
          source_type: "manual",
          line_items: validLines
        })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error?.message ?? "Journal entry could not be saved.");
      toast.success("Journal entry saved.");
      router.push(`/journal-entries/${json.data?.id ?? editId ?? ""}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Journal entry could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading journal editor...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editId ? "Edit journal entry" : "New journal entry"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Entry number</Label>
            <Input value={entryNumber} onChange={(event) => setEntryNumber(event.target.value)} className="mt-2" />
          </div>
          <div>
            <Label>Status</Label>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
              {["draft", "submitted", "approved", "posted"].map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div>
            <Label>Entry date</Label>
            <Input type="date" value={entryDate} onChange={(event) => setEntryDate(event.target.value)} className="mt-2" />
          </div>
          <div className="md:col-span-2">
            <Label>Memo</Label>
            <Textarea value={memo} onChange={(event) => setMemo(event.target.value)} className="mt-2" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Journal lines</CardTitle>
          <Button type="button" variant="secondary" onClick={() => setLines((current) => [...current, emptyLine()])}>Add line</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {lines.map((line, index) => (
            <div key={index} className="grid gap-3 rounded-lg border p-4 md:grid-cols-6">
              <div className="md:col-span-2">
                <Label>Account</Label>
                <select value={line.account_id} onChange={(event) => updateLine(index, { account_id: event.target.value })} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
                  <option value="">Select account</option>
                  {accounts.map((account) => <option key={account.id} value={account.id}>{account.code ? `${account.code} - ` : ""}{account.name}</option>)}
                </select>
                <div className="mt-2 flex gap-3 text-xs">
                  <Link href="/chart-of-accounts/new" className="text-primary underline underline-offset-2">New account</Link>
                  {line.account_id ? <Link href="/chart-of-accounts" className="text-muted-foreground underline underline-offset-2">Open chart of accounts</Link> : null}
                </div>
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <Input value={line.description} onChange={(event) => updateLine(index, { description: event.target.value })} className="mt-2" />
              </div>
              <div>
                <Label>Debit</Label>
                <Input type="number" step="0.01" value={line.debit} onChange={(event) => updateLine(index, { debit: Number(event.target.value || 0), credit: Number(event.target.value || 0) > 0 ? 0 : line.credit })} className="mt-2" />
              </div>
              <div>
                <Label>Credit</Label>
                <Input type="number" step="0.01" value={line.credit} onChange={(event) => updateLine(index, { credit: Number(event.target.value || 0), debit: Number(event.target.value || 0) > 0 ? 0 : line.debit })} className="mt-2" />
              </div>
              <div className="md:col-span-6 flex justify-end">
                <Button type="button" variant="ghost" onClick={() => setLines((current) => current.length <= 2 ? [emptyLine(), emptyLine()] : current.filter((_, rowIndex) => rowIndex !== index))}>Remove</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Balance check</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-2">
          <div className="flex justify-between"><span className="text-muted-foreground">Debits</span><span>{formatMoney(totals.debits)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Credits</span><span>{formatMoney(totals.credits)}</span></div>
          <div className="flex justify-between font-semibold md:col-span-2"><span>Status</span><span>{totals.balanced ? "Balanced" : "Out of balance"}</span></div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => router.push("/journal-entries")}>Cancel</Button>
        <Button type="button" onClick={submit} disabled={saving}>{saving ? "Saving..." : "Save journal entry"}</Button>
      </div>
    </div>
  );
}
