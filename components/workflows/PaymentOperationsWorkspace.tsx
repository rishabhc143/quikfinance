"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/utils/currency";

type SettlementRecord = {
  id: string;
  settlement_id: string;
  settlement_date: string;
  gross_amount: number;
  fee_amount: number;
  tax_amount: number;
  net_amount: number;
  status: "pending" | "matched" | "posted" | "exception";
  created_at: string;
};

type WorkflowResponse = {
  records: SettlementRecord[];
  total: number;
};

function statusTone(status: string) {
  if (status === "posted" || status === "matched") return "success" as const;
  if (status === "exception") return "danger" as const;
  return "warning" as const;
}

export function PaymentOperationsWorkspace() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [grossAmount, setGrossAmount] = useState("0");
  const [feeAmount, setFeeAmount] = useState("0");
  const [taxAmount, setTaxAmount] = useState("0");
  const [settlementDate, setSettlementDate] = useState(new Date().toISOString().slice(0, 10));

  const settlements = useQuery({
    queryKey: ["payment-operations", search],
    queryFn: async () => {
      const response = await fetch(`/api/v1/workflows/payment-operations${search ? `?search=${encodeURIComponent(search)}` : ""}`, { cache: "no-store" });
      const payload = (await response.json()) as { data?: WorkflowResponse; error?: { message?: string } };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Payment operations could not be loaded.");
      }
      return payload.data;
    }
  });

  const createSettlement = useMutation({
    mutationFn: async () => {
      const gross = Number(grossAmount || 0);
      const fee = Number(feeAmount || 0);
      const tax = Number(taxAmount || 0);
      const response = await fetch("/api/v1/workflows/payment-operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settlement_date: settlementDate,
          gross_amount: gross,
          fee_amount: fee,
          tax_amount: tax,
          net_amount: gross - fee - tax,
          status: "pending"
        })
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Settlement could not be created.");
      }
    },
    onSuccess: async () => {
      toast.success("Settlement created.");
      setGrossAmount("0");
      setFeeAmount("0");
      setTaxAmount("0");
      await queryClient.invalidateQueries({ queryKey: ["payment-operations"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Settlement could not be created.");
    }
  });

  const updateSettlement = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: SettlementRecord["status"] }) => {
      const response = await fetch(`/api/v1/workflows/payment-operations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Settlement update failed.");
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["payment-operations"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Settlement update failed.");
    }
  });

  const records = useMemo(() => settlements.data?.records ?? [], [settlements.data?.records]);
  const pendingCount = useMemo(() => records.filter((record) => record.status === "pending").length, [records]);
  const totalNet = useMemo(() => records.reduce((sum, record) => sum + Number(record.net_amount ?? 0), 0), [records]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Pending settlements</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{pendingCount}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Total settlements</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{settlements.data?.total ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Net tracked</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{formatMoney(totalNet)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create settlement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="settlement-date">Settlement date</Label>
              <Input id="settlement-date" type="date" value={settlementDate} onChange={(event) => setSettlementDate(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="gross-amount">Gross amount</Label>
              <Input id="gross-amount" type="number" value={grossAmount} onChange={(event) => setGrossAmount(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="fee-amount">Fee amount</Label>
              <Input id="fee-amount" type="number" value={feeAmount} onChange={(event) => setFeeAmount(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="tax-amount">Tax amount</Label>
              <Input id="tax-amount" type="number" value={taxAmount} onChange={(event) => setTaxAmount(event.target.value)} />
            </div>
            <div className="lg:col-span-4 flex justify-end">
              <Button onClick={() => createSettlement.mutate()} disabled={createSettlement.isPending}>
                {createSettlement.isPending ? "Creating..." : "Create settlement"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>Settlement queue</CardTitle>
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search settlements" className="md:max-w-xs" />
        </CardHeader>
        <CardContent className="space-y-3">
          {settlements.isLoading ? <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Loading settlements...</div> : null}
          {settlements.isError ? <div className="rounded-xl border border-destructive/30 p-5 text-sm text-destructive">{(settlements.error as Error).message}</div> : null}
          {!settlements.isLoading && !settlements.isError && records.length === 0 ? <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">No settlements found.</div> : null}
          {records.map((record) => (
            <div key={record.id} className="rounded-2xl border p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{record.settlement_id}</p>
                    <Badge tone={statusTone(record.status)}>{record.status}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span>{record.settlement_date}</span>
                    <span>Gross: {formatMoney(record.gross_amount)}</span>
                    <span>Fee: {formatMoney(record.fee_amount)}</span>
                    <span>Tax: {formatMoney(record.tax_amount)}</span>
                    <span>Net: {formatMoney(record.net_amount)}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {record.status !== "matched" ? <Button variant="secondary" onClick={() => updateSettlement.mutate({ id: record.id, status: "matched" })}>Mark matched</Button> : null}
                  {record.status !== "posted" ? <Button onClick={() => updateSettlement.mutate({ id: record.id, status: "posted" })}>Post</Button> : null}
                  {record.status !== "exception" ? <Button variant="ghost" onClick={() => updateSettlement.mutate({ id: record.id, status: "exception" })}>Flag exception</Button> : null}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
