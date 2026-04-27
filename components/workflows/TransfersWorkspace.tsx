"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/utils/currency";
import { todayISO } from "@/lib/utils/dates";

type BankAccountRow = {
  id: string;
  name?: string;
  institution_name?: string | null;
  current_balance?: number;
  is_active?: boolean;
};

type TransferRow = {
  id: string;
  source_bank_account_id: string;
  destination_bank_account_id: string;
  source_bank_name?: string;
  destination_bank_name?: string;
  transfer_date: string;
  amount: number;
  reference: string | null;
  memo: string | null;
  status: string;
  journal_entry_id: string | null;
};

export function TransfersWorkspace() {
  const queryClient = useQueryClient();
  const [sourceBankAccountId, setSourceBankAccountId] = useState("");
  const [destinationBankAccountId, setDestinationBankAccountId] = useState("");
  const [transferDate, setTransferDate] = useState(todayISO());
  const [amount, setAmount] = useState("0");
  const [reference, setReference] = useState("");
  const [memo, setMemo] = useState("");
  const [status, setStatus] = useState<"draft" | "posted">("posted");

  const bankAccounts = useQuery({
    queryKey: ["transfer-bank-accounts"],
    queryFn: async () => {
      const response = await fetch("/api/v1/bank-accounts", { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as { data?: BankAccountRow[] };
      return Array.isArray(payload.data) ? payload.data : [];
    }
  });

  const transfers = useQuery({
    queryKey: ["internal-transfers"],
    queryFn: async () => {
      const response = await fetch("/api/v1/transfers", { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as { data?: TransferRow[]; error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Transfers could not be loaded.");
      }
      return Array.isArray(payload.data) ? payload.data : [];
    }
  });

  const createTransfer = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/v1/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_bank_account_id: sourceBankAccountId,
          destination_bank_account_id: destinationBankAccountId,
          transfer_date: transferDate,
          amount: Number(amount),
          reference: reference || null,
          memo: memo || null,
          status
        })
      });
      const payload = (await response.json().catch(() => ({}))) as { data?: TransferRow; error?: { message?: string } };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Transfer could not be created.");
      }
      return payload.data;
    },
    onSuccess: async () => {
      toast.success("Transfer saved.");
      setAmount("0");
      setReference("");
      setMemo("");
      setStatus("posted");
      await queryClient.invalidateQueries({ queryKey: ["internal-transfers"] });
      await queryClient.invalidateQueries({ queryKey: ["transfer-bank-accounts"] });
      await queryClient.invalidateQueries({ queryKey: ["module", "bank-accounts"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Transfer could not be created.")
  });

  const cancelTransfer = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/v1/transfers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" })
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Transfer could not be cancelled.");
      }
    },
    onSuccess: async () => {
      toast.success("Transfer cancelled.");
      await queryClient.invalidateQueries({ queryKey: ["internal-transfers"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Transfer could not be cancelled.")
  });

  const rows = useMemo(() => bankAccounts.data ?? [], [bankAccounts.data]);
  const transferRows = useMemo(() => transfers.data ?? [], [transfers.data]);
  const metrics = useMemo(() => ({
    activeAccounts: rows.filter((row) => row.is_active !== false).length,
    treasuryBalance: rows.reduce((sum, row) => sum + Number(row.current_balance ?? 0), 0),
    postedTransfers: transferRows.filter((row) => row.status === "posted").length,
    draftTransfers: transferRows.filter((row) => row.status === "draft").length
  }), [rows, transferRows]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Active bank accounts</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.activeAccounts}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Treasury balance</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatMoney(metrics.treasuryBalance)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Posted transfers</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.postedTransfers}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Draft transfers</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.draftTransfers}</CardContent></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>Post internal transfer</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="source-bank">Source bank account</Label>
              <select id="source-bank" value={sourceBankAccountId} onChange={(event) => setSourceBankAccountId(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">Select source</option>
                {rows.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="destination-bank">Destination bank account</Label>
              <select id="destination-bank" value={destinationBankAccountId} onChange={(event) => setDestinationBankAccountId(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">Select destination</option>
                {rows.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="transfer-date">Transfer date</Label>
              <Input id="transfer-date" type="date" value={transferDate} onChange={(event) => setTransferDate(event.target.value)} className="mt-2" />
            </div>
            <div>
              <Label htmlFor="transfer-amount">Amount</Label>
              <Input id="transfer-amount" type="number" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-2" />
            </div>
            <div>
              <Label htmlFor="transfer-reference">Reference</Label>
              <Input id="transfer-reference" value={reference} onChange={(event) => setReference(event.target.value)} className="mt-2" placeholder="TRF-0427" />
            </div>
            <div>
              <Label htmlFor="transfer-status">Posting mode</Label>
              <select id="transfer-status" value={status} onChange={(event) => setStatus(event.target.value as "draft" | "posted")} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="posted">post immediately</option>
                <option value="draft">save as draft</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="transfer-memo">Memo</Label>
              <Textarea id="transfer-memo" rows={4} value={memo} onChange={(event) => setMemo(event.target.value)} className="mt-2" placeholder="Treasury move from collections account to tax reserve." />
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-2">
              <Button onClick={() => createTransfer.mutate()} disabled={createTransfer.isPending || !sourceBankAccountId || !destinationBankAccountId || Number(amount) <= 0}>
                {createTransfer.isPending ? "Saving..." : "Save transfer"}
              </Button>
              <Button asChild variant="secondary"><Link href="/bank-accounts">Bank accounts</Link></Button>
              <Button asChild variant="secondary"><Link href="/bank-accounts">Reconciliation</Link></Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transfer controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="rounded-xl bg-muted/40 p-3">Posted transfers create a journal entry that debits the destination bank ledger and credits the source bank ledger.</div>
            <div className="rounded-xl bg-muted/40 p-3">Internal transfers do not create income or expense unless a separate fee or FX entry is posted.</div>
            <div className="rounded-xl bg-muted/40 p-3">Use a shared transfer reference so both treasury ops and reconciliation teams can trace the movement.</div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="secondary"><Link href="/audit-trail">Audit trail</Link></Button>
              <Button asChild variant="secondary"><Link href="/payment-operations">Payment operations</Link></Button>
              <Button asChild variant="secondary"><Link href="/exception-queue">Review exceptions</Link></Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent transfers</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {transfers.isLoading ? <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Loading transfers...</div> : null}
          {transfers.isError ? <div className="rounded-xl border border-destructive/30 p-5 text-sm text-destructive">{(transfers.error as Error).message}</div> : null}
          {!transfers.isLoading && !transfers.isError && transferRows.length === 0 ? <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">No transfers recorded yet.</div> : null}
          {transferRows.map((transfer) => (
            <div key={transfer.id} className="rounded-2xl border p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-1">
                  <div className="font-semibold">{transfer.reference ?? transfer.id}</div>
                  <div className="text-sm text-muted-foreground">{transfer.transfer_date} - {transfer.source_bank_name ?? "Source"} to {transfer.destination_bank_name ?? "Destination"}</div>
                  <div className="text-sm">{transfer.memo ?? "No memo provided."}</div>
                  {transfer.journal_entry_id ? <div className="text-xs text-muted-foreground">Journal: {transfer.journal_entry_id}</div> : null}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="font-medium">{formatMoney(transfer.amount)}</div>
                  <StatusBadge status={transfer.status} />
                  {transfer.status === "draft" ? (
                    <Button variant="secondary" onClick={() => cancelTransfer.mutate(transfer.id)} disabled={cancelTransfer.isPending}>
                      {cancelTransfer.isPending ? "Saving..." : "Cancel draft"}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
