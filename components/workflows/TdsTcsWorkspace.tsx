"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import type { TableRow } from "@/lib/modules";
import { formatMoney } from "@/lib/utils/currency";

const columns = [
  { key: "section_code", label: "Section" },
  { key: "tax_kind", label: "Kind" },
  { key: "transaction_type", label: "Transaction" },
  { key: "party_name", label: "Party" },
  { key: "assessment_date", label: "Assessment", kind: "date" as const },
  { key: "tax_amount", label: "Tax amount", kind: "money" as const, align: "right" as const },
  { key: "status", label: "Status", kind: "status" as const }
];

export function TdsTcsWorkspace() {
  const router = useRouter();
  const [rows, setRows] = useState<TableRow[]>([]);
  const [bills, setBills] = useState<TableRow[]>([]);
  const [invoices, setInvoices] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const [recordsRes, customersRes, vendorsRes, billsRes, invoicesRes] = await Promise.all([
        fetch("/api/v1/tds-tcs", { signal, cache: "no-store" }),
        fetch("/api/v1/customers", { signal, cache: "no-store" }),
        fetch("/api/v1/vendors", { signal, cache: "no-store" }),
        fetch("/api/v1/bills", { signal, cache: "no-store" }),
        fetch("/api/v1/invoices", { signal, cache: "no-store" })
      ]);
      const [recordsJson, customersJson, vendorsJson, billsJson, invoicesJson] = await Promise.all([
        recordsRes.json().catch(() => ({ data: [] })),
        customersRes.json().catch(() => ({ data: [] })),
        vendorsRes.json().catch(() => ({ data: [] })),
        billsRes.json().catch(() => ({ data: [] })),
        invoicesRes.json().catch(() => ({ data: [] }))
      ]);
      const partyMap = new Map<string, string>();
      for (const row of Array.isArray(customersJson.data) ? customersJson.data : []) {
        partyMap.set(String(row.id), String(row.display_name ?? "Customer"));
      }
      for (const row of Array.isArray(vendorsJson.data) ? vendorsJson.data : []) {
        partyMap.set(String(row.id), String(row.display_name ?? "Vendor"));
      }
      const mapped = Array.isArray(recordsJson.data)
        ? recordsJson.data.map((row: Record<string, unknown>) => ({
            ...row,
            party_name: partyMap.get(String(row.party_id ?? "")) ?? String(row.party_type ?? "party")
          }))
        : [];
      setRows(mapped);
      setBills(Array.isArray(billsJson.data) ? billsJson.data : []);
      setInvoices(Array.isArray(invoicesJson.data) ? invoicesJson.data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, []);

  const summary = useMemo(() => {
    const tax = rows.reduce((sum, row) => sum + Number(row.tax_amount ?? 0), 0);
    const review = rows.filter((row) => String(row.status ?? "") === "review").length;
    const filed = rows.filter((row) => String(row.status ?? "") === "filed").length;
    return { tax, review, filed };
  }, [rows]);

  const existingKeys = useMemo(
    () => new Set(rows.map((row) => `${String(row.transaction_type ?? "")}:${String(row.transaction_id ?? "")}`)),
    [rows]
  );

  const billCandidates = useMemo(
    () => bills.filter((row) => !existingKeys.has(`bill:${String(row.id)}`)).slice(0, 3),
    [bills, existingKeys]
  );

  const invoiceCandidates = useMemo(
    () => invoices.filter((row) => !existingKeys.has(`invoice:${String(row.id)}`)).slice(0, 3),
    [invoices, existingKeys]
  );

  const assess = async (transactionType: "bill" | "invoice", transactionId: string) => {
    const key = `${transactionType}:${transactionId}`;
    setBusyKey(key);
    try {
      const response = await fetch("/api/v1/tds-tcs/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transaction_type: transactionType, transaction_id: transactionId })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error?.message ?? "Tax record could not be assessed.");
      toast.success("Tax record created.");
      await load();
      router.push(`/tds-tcs/${json.data.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Tax record could not be assessed.");
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="TDS / TCS" description="Review withholding and collection tax records across bills, invoices, payments, and filing cycles." actionLabel="New tax record" actionHref="/tds-tcs/new" />
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle>Tracked tax</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatMoney(summary.tax)}</CardContent></Card>
        <Card><CardHeader><CardTitle>In review</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.review}</CardContent></Card>
        <Card><CardHeader><CardTitle>Filed</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.filed}</CardContent></Card>
      </div>
      {(billCandidates.length || invoiceCandidates.length) ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Bill candidates</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {billCandidates.length ? billCandidates.map((bill) => {
                const key = `bill:${String(bill.id)}`;
                return (
                  <div key={String(bill.id)} className="flex flex-col gap-3 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold">{String(bill.bill_number ?? bill.id)}</p>
                      <p className="text-sm text-muted-foreground">Total {formatMoney(Number(bill.total ?? 0))}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => assess("bill", String(bill.id))} disabled={busyKey === key}>
                        {busyKey === key ? "Assessing..." : "Assess TDS"}
                      </Button>
                      <Button asChild><Link href={`/bills/${String(bill.id)}`}>Open bill</Link></Button>
                    </div>
                  </div>
                );
              }) : <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No new bill candidates.</div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Invoice candidates</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {invoiceCandidates.length ? invoiceCandidates.map((invoice) => {
                const key = `invoice:${String(invoice.id)}`;
                return (
                  <div key={String(invoice.id)} className="flex flex-col gap-3 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold">{String(invoice.invoice_number ?? invoice.id)}</p>
                      <p className="text-sm text-muted-foreground">Total {formatMoney(Number(invoice.total ?? 0))}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => assess("invoice", String(invoice.id))} disabled={busyKey === key}>
                        {busyKey === key ? "Assessing..." : "Assess TCS"}
                      </Button>
                      <Button asChild><Link href={`/invoices/${String(invoice.id)}`}>Open invoice</Link></Button>
                    </div>
                  </div>
                );
              }) : <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No new invoice candidates.</div>}
            </CardContent>
          </Card>
        </div>
      ) : null}
      {loading ? <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading tax records...</div> : rows.length ? <DataTable columns={columns} rows={rows} title="TDS/TCS" getRowHref={(row) => `/tds-tcs/${row.id}`} /> : <EmptyState title="No tax records yet" description="Create the first TDS or TCS assessment record to start the withholding workflow." actionLabel="New tax record" actionHref="/tds-tcs/new" />}
    </div>
  );
}

