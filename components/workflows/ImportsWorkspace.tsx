"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import type { TableRow } from "@/lib/modules";

type BankAccount = { id: string; name: string };

const columns = [
  { key: "created_at", label: "Created", kind: "date" as const },
  { key: "source_type", label: "Source" },
  { key: "entity_type", label: "Entity" },
  { key: "imported_rows", label: "Imported" },
  { key: "failed_rows", label: "Failed" },
  { key: "status", label: "Status", kind: "status" as const }
];

export function ImportsWorkspace() {
  const [rows, setRows] = useState<TableRow[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sourceType, setSourceType] = useState("csv");
  const [entityType, setEntityType] = useState("customers");
  const [fileName, setFileName] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [notes, setNotes] = useState("");
  const [payloadText, setPayloadText] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [importsRes, banksRes] = await Promise.all([
        fetch("/api/v1/imports", { cache: "no-store" }),
        fetch("/api/v1/bank-accounts", { cache: "no-store" })
      ]);
      const importsJson = await importsRes.json().catch(() => ({ data: [] }));
      const banksJson = await banksRes.json().catch(() => ({ data: [] }));
      setRows(Array.isArray(importsJson.data) ? importsJson.data : []);
      setBankAccounts(Array.isArray(banksJson.data) ? banksJson.data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const summary = useMemo(() => {
    const jobs = rows.length;
    const warnings = rows.filter((row) => String(row.status ?? "").includes("warning")).length;
    const imported = rows.reduce((sum, row) => sum + Number(row.imported_rows ?? 0), 0);
    return { jobs, warnings, imported };
  }, [rows]);

  const submit = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/v1/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_type: sourceType,
          entity_type: entityType,
          file_name: fileName || null,
          bank_account_id: bankAccountId || null,
          notes: notes || null,
          payload_text: payloadText
        })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error?.message ?? "Import failed.");
      toast.success("Import job completed.");
      setPayloadText("");
      setFileName("");
      setNotes("");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setSaving(false);
    }
  };

  const needsBank = sourceType === "bank_statement" || entityType === "bank_transactions";

  return (
    <div className="space-y-6">
      <PageHeader title="Imports" description="Run CSV, Tally, Zoho Books, and bank-statement imports with validation feedback and retry visibility." />

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle>Import jobs</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.jobs}</CardContent></Card>
        <Card><CardHeader><CardTitle>Imported rows</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.imported}</CardContent></Card>
        <Card>
          <CardHeader><CardTitle>Warnings</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="text-2xl font-bold">{summary.warnings}</div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="secondary"><Link href="/migration-center">Migration center</Link></Button>
              <Button asChild variant="secondary"><Link href="/bank-feeds">Bank feeds</Link></Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New import</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Source type</Label>
            <select value={sourceType} onChange={(event) => setSourceType(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="csv">CSV</option>
              <option value="tally">Tally</option>
              <option value="zoho_books">Zoho Books</option>
              <option value="bank_statement">Bank statement</option>
            </select>
          </div>
          <div>
            <Label>Entity type</Label>
            <select value={entityType} onChange={(event) => setEntityType(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="customers">Customers</option>
              <option value="vendors">Vendors</option>
              <option value="invoices">Invoices</option>
              <option value="bills">Bills</option>
              <option value="payments">Payments</option>
              <option value="bank_transactions">Bank transactions</option>
            </select>
          </div>
          <div>
            <Label>File name</Label>
            <Input value={fileName} onChange={(event) => setFileName(event.target.value)} className="mt-2" placeholder="customers.csv" />
          </div>
          <div>
            <Label>Bank account</Label>
            <select value={bankAccountId} onChange={(event) => setBankAccountId(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="">{needsBank ? "Select bank account" : "Optional"}</option>
              {bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <Label>Payload</Label>
            <Textarea value={payloadText} onChange={(event) => setPayloadText(event.target.value)} className="mt-2 min-h-[240px] font-mono text-xs" placeholder="Paste CSV or structured JSON payload here" />
          </div>
          <div className="md:col-span-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-2" />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button type="button" onClick={submit} disabled={saving}>{saving ? "Processing..." : "Run import"}</Button>
          </div>
        </CardContent>
      </Card>

      {loading ? <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading import jobs...</div> : rows.length ? <DataTable columns={columns} rows={rows} title="Imports" /> : <EmptyState title="No imports yet" description="Paste a CSV, Tally export, Zoho Books dump, or bank statement to create your first import job." />}
    </div>
  );
}
