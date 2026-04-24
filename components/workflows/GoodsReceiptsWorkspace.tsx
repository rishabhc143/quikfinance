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

type GoodsReceiptRecord = {
  id: string;
  movement_type: "receipt" | "issue" | "transfer" | "adjustment" | "dispatch";
  quantity: number;
  unit_cost: number;
  status: "draft" | "posted" | "cancelled";
  source_type: string | null;
  reason: string | null;
  created_at: string;
};

type WorkflowResponse = {
  records: GoodsReceiptRecord[];
  total: number;
};

function statusTone(status: GoodsReceiptRecord["status"]) {
  if (status === "posted") return "success" as const;
  if (status === "cancelled") return "danger" as const;
  return "warning" as const;
}

export function GoodsReceiptsWorkspace() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [sourceType, setSourceType] = useState("purchase_order");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("0");
  const [reason, setReason] = useState("");

  const goodsReceipts = useQuery({
    queryKey: ["goods-receipts", search],
    queryFn: async () => {
      const response = await fetch(`/api/v1/workflows/goods-receipts${search ? `?search=${encodeURIComponent(search)}` : ""}`, { cache: "no-store" });
      const payload = (await response.json()) as { data?: WorkflowResponse; error?: { message?: string } };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Goods receipts could not be loaded.");
      }
      return payload.data;
    }
  });

  const createReceipt = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/v1/workflows/goods-receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movement_type: "receipt",
          source_type: sourceType,
          quantity: Number(quantity || 0),
          unit_cost: Number(unitCost || 0),
          reason: reason || `Goods receipt from ${sourceType}`,
          status: "draft"
        })
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "Goods receipt could not be created.");
    },
    onSuccess: async () => {
      toast.success("Goods receipt created.");
      setQuantity("1");
      setUnitCost("0");
      setReason("");
      setSourceType("purchase_order");
      await queryClient.invalidateQueries({ queryKey: ["goods-receipts"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Goods receipt could not be created.")
  });

  const updateReceipt = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: GoodsReceiptRecord["status"] }) => {
      const response = await fetch(`/api/v1/workflows/goods-receipts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "Goods receipt update failed.");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["goods-receipts"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Goods receipt update failed.")
  });

  const records = useMemo(() => (goodsReceipts.data?.records ?? []).filter((record) => record.movement_type === "receipt"), [goodsReceipts.data?.records]);
  const draftCount = useMemo(() => records.filter((record) => record.status === "draft").length, [records]);
  const postedCount = useMemo(() => records.filter((record) => record.status === "posted").length, [records]);
  const totalValue = useMemo(() => records.reduce((sum, record) => sum + record.quantity * record.unit_cost, 0), [records]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Total receipts</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{records.length}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Draft</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{draftCount}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Posted</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{postedCount}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Receipt value</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{totalValue.toLocaleString("en-IN")}</CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>Create goods receipt</CardTitle>
          <Button asChild variant="secondary"><Link href="/purchase-orders">Open Purchase Orders</Link></Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div>
              <Label htmlFor="grn-source">Source type</Label>
              <select id="grn-source" value={sourceType} onChange={(event) => setSourceType(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="purchase_order">Purchase order</option>
                <option value="vendor_return">Vendor return reversal</option>
                <option value="manual_receipt">Manual receipt</option>
              </select>
            </div>
            <div>
              <Label htmlFor="grn-quantity">Quantity</Label>
              <Input id="grn-quantity" type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="grn-unit-cost">Unit cost</Label>
              <Input id="grn-unit-cost" type="number" value={unitCost} onChange={(event) => setUnitCost(event.target.value)} />
            </div>
            <div className="lg:col-span-2">
              <Label htmlFor="grn-reason">Reason</Label>
              <Input id="grn-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Receipt against approved PO" />
            </div>
            <div className="lg:col-span-5 flex justify-end">
              <Button onClick={() => createReceipt.mutate()} disabled={createReceipt.isPending || Number(quantity) <= 0}>
                {createReceipt.isPending ? "Creating..." : "Create receipt"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>Receipt queue</CardTitle>
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search receipts" className="md:max-w-xs" />
        </CardHeader>
        <CardContent className="space-y-3">
          {goodsReceipts.isLoading ? <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Loading receipts...</div> : null}
          {goodsReceipts.isError ? <div className="rounded-xl border border-destructive/30 p-5 text-sm text-destructive">{(goodsReceipts.error as Error).message}</div> : null}
          {!goodsReceipts.isLoading && !goodsReceipts.isError && records.length === 0 ? <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">No goods receipts found.</div> : null}
          {records.map((record) => (
            <div key={record.id} className="rounded-2xl border p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{record.reason || "Goods receipt"}</p>
                    <Badge tone={statusTone(record.status)}>{record.status}</Badge>
                    <Badge tone="info">{record.source_type || "manual"}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span>Qty: {record.quantity}</span>
                    <span>Unit cost: {record.unit_cost.toLocaleString("en-IN")}</span>
                    <span>Value: {(record.quantity * record.unit_cost).toLocaleString("en-IN")}</span>
                    <span>{new Date(record.created_at).toLocaleString("en-IN")}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {record.status !== "posted" ? <Button variant="secondary" onClick={() => updateReceipt.mutate({ id: record.id, status: "posted" })}>Post</Button> : null}
                  {record.status !== "cancelled" ? <Button variant="ghost" onClick={() => updateReceipt.mutate({ id: record.id, status: "cancelled" })}>Cancel</Button> : null}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
