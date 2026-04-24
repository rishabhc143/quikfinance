"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/utils/currency";

type CollectionsPayload = {
  metrics: {
    total_outstanding: number;
    overdue_count: number;
    due_this_week_count: number;
    open_payment_links: number;
  };
  invoices: Array<{ id: string; invoice_number: string; due_date: string; total: number; balance_due: number; status: string }>;
  receipts: Array<{ id: string; payment_date: string; amount: number; method: string; reference: string | null; status: string }>;
  payment_links: Array<{ id: string; invoice_id: string; status: string; amount: number; amount_paid: number; short_url: string | null; created_at: string }>;
};

export function CollectionsWorkspace() {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("0");
  const [method, setMethod] = useState("Bank Transfer");
  const [reference, setReference] = useState("");
  const [search, setSearch] = useState("");

  const overview = useQuery({
    queryKey: ["collections-overview"],
    queryFn: async () => {
      const response = await fetch("/api/v1/operations/collections", { cache: "no-store" });
      const payload = (await response.json()) as { data?: CollectionsPayload; error?: { message?: string } };
      if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? "Collections overview could not be loaded.");
      return payload.data;
    }
  });

  const createReceipt = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/v1/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_type: "received", payment_date: new Date().toISOString().slice(0, 10), amount: Number(amount || 0), currency: "INR", exchange_rate: 1, method, reference: reference || null, status: "posted", memo: "Collection workspace receipt" })
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "Receipt could not be recorded.");
    },
    onSuccess: async () => {
      toast.success("Receipt recorded.");
      setAmount("0");
      setReference("");
      await queryClient.invalidateQueries({ queryKey: ["collections-overview"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Receipt could not be recorded.")
  });

  const invoices = useMemo(() => (overview.data?.invoices ?? []).filter((row) => row.invoice_number.toLowerCase().includes(search.toLowerCase())), [overview.data?.invoices, search]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Outstanding</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatMoney(overview.data?.metrics.total_outstanding ?? 0)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Overdue invoices</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{overview.data?.metrics.overdue_count ?? 0}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Due this week</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{overview.data?.metrics.due_this_week_count ?? 0}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Open payment links</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{overview.data?.metrics.open_payment_links ?? 0}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Record receipt</CardTitle></CardHeader>
        <CardContent><div className="grid gap-4 md:grid-cols-4"><div><Label htmlFor="receipt-amount">Amount</Label><Input id="receipt-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div><div><Label htmlFor="receipt-method">Method</Label><Input id="receipt-method" value={method} onChange={(e) => setMethod(e.target.value)} /></div><div><Label htmlFor="receipt-reference">Reference</Label><Input id="receipt-reference" value={reference} onChange={(e) => setReference(e.target.value)} /></div><div className="flex items-end justify-end"><Button onClick={() => createReceipt.mutate()} disabled={createReceipt.isPending}>{createReceipt.isPending ? "Recording..." : "Record receipt"}</Button></div></div></CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><CardTitle>Receivables queue</CardTitle><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoices" className="md:max-w-xs" /></CardHeader>
        <CardContent className="space-y-3">
          {overview.isLoading ? <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Loading collections...</div> : null}
          {overview.isError ? <div className="rounded-xl border border-destructive/30 p-5 text-sm text-destructive">{(overview.error as Error).message}</div> : null}
          {invoices.map((invoice) => (
            <div key={invoice.id} className="rounded-2xl border p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div className="space-y-2"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{invoice.invoice_number}</p><Badge tone={invoice.balance_due > 0 ? "warning" : "success"}>{invoice.status}</Badge></div><div className="flex flex-wrap gap-4 text-sm text-muted-foreground"><span>Due: {invoice.due_date}</span><span>Total: {formatMoney(invoice.total)}</span><span>Balance: {formatMoney(invoice.balance_due)}</span></div></div><div className="flex flex-wrap gap-2"><Button variant="secondary" asChild><Link href={`/invoices/${invoice.id}`}>Open invoice</Link></Button><Button asChild><Link href={`/invoices/${invoice.id}/payment-link`}>Payment link</Link></Button></div></div></div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
