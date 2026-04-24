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

type PayablesPayload = {
  metrics: { total_outstanding: number; overdue_count: number; pending_approvals: number; bills_count: number };
  bills: Array<{ id: string; bill_number: string; due_date: string; total: number; balance_due: number; status: string }>;
  payouts: Array<{ id: string; payment_date: string; amount: number; method: string; reference: string | null; status: string }>;
};

export function PayablesWorkspace() {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("0");
  const [method, setMethod] = useState("Bank Transfer");
  const [reference, setReference] = useState("");
  const [search, setSearch] = useState("");

  const overview = useQuery({
    queryKey: ["payables-overview"],
    queryFn: async () => {
      const response = await fetch("/api/v1/operations/payables", { cache: "no-store" });
      const payload = (await response.json()) as { data?: PayablesPayload; error?: { message?: string } };
      if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? "Payables overview could not be loaded.");
      return payload.data;
    }
  });

  const createPayout = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/v1/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_type: "made", payment_date: new Date().toISOString().slice(0, 10), amount: Number(amount || 0), currency: "INR", exchange_rate: 1, method, reference: reference || null, status: "posted", memo: "Payables workspace payout" })
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "Payout could not be recorded.");
    },
    onSuccess: async () => {
      toast.success("Payout recorded.");
      setAmount("0");
      setReference("");
      await queryClient.invalidateQueries({ queryKey: ["payables-overview"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Payout could not be recorded.")
  });

  const bills = useMemo(() => (overview.data?.bills ?? []).filter((row) => row.bill_number.toLowerCase().includes(search.toLowerCase())), [overview.data?.bills, search]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Outstanding</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatMoney(overview.data?.metrics.total_outstanding ?? 0)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Overdue bills</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{overview.data?.metrics.overdue_count ?? 0}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Pending approvals</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{overview.data?.metrics.pending_approvals ?? 0}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Bills in queue</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{overview.data?.metrics.bills_count ?? 0}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Record payout</CardTitle></CardHeader>
        <CardContent><div className="grid gap-4 md:grid-cols-4"><div><Label htmlFor="payout-amount">Amount</Label><Input id="payout-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div><div><Label htmlFor="payout-method">Method</Label><Input id="payout-method" value={method} onChange={(e) => setMethod(e.target.value)} /></div><div><Label htmlFor="payout-reference">Reference</Label><Input id="payout-reference" value={reference} onChange={(e) => setReference(e.target.value)} /></div><div className="flex items-end justify-end"><Button onClick={() => createPayout.mutate()} disabled={createPayout.isPending}>{createPayout.isPending ? "Recording..." : "Record payout"}</Button></div></div></CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><CardTitle>Payables queue</CardTitle><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search bills" className="md:max-w-xs" /></CardHeader>
        <CardContent className="space-y-3">
          {overview.isLoading ? <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Loading payables...</div> : null}
          {overview.isError ? <div className="rounded-xl border border-destructive/30 p-5 text-sm text-destructive">{(overview.error as Error).message}</div> : null}
          {bills.map((bill) => (
            <div key={bill.id} className="rounded-2xl border p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div className="space-y-2"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{bill.bill_number}</p><Badge tone={bill.balance_due > 0 ? "warning" : "success"}>{bill.status}</Badge></div><div className="flex flex-wrap gap-4 text-sm text-muted-foreground"><span>Due: {bill.due_date}</span><span>Total: {formatMoney(bill.total)}</span><span>Balance: {formatMoney(bill.balance_due)}</span></div></div><div className="flex flex-wrap gap-2"><Button variant="secondary" asChild><Link href={`/bills/${bill.id}`}>Open bill</Link></Button><Button asChild><Link href="/payments/made/new">New payout</Link></Button></div></div></div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
