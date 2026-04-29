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

type InventoryItem = {
  id: string;
  sku: string;
  name: string;
  quantity_on_hand: number;
  reorder_point: number;
  purchase_price: number;
};

type Warehouse = {
  id: string;
  code?: string | null;
  name?: string | null;
};

type GoodsReceiptRecord = {
  id: string;
  movement_type: "receipt";
  quantity: number;
  unit_cost: number;
  status: "draft" | "posted" | "cancelled";
  source_type: string | null;
  reason: string | null;
  created_at: string;
  item?: InventoryItem | null;
  warehouse?: Warehouse | null;
};

type ReceiptPayload = {
  records: GoodsReceiptRecord[];
  summary: {
    total: number;
    draft: number;
    posted: number;
    tracked_value: number;
    low_stock_items: number;
  };
};

function statusTone(status: GoodsReceiptRecord["status"]) {
  if (status === "posted") return "success" as const;
  if (status === "cancelled") return "warning" as const;
  return "info" as const;
}

export function GoodsReceiptsWorkspace() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [itemId, setItemId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [sourceType, setSourceType] = useState("purchase_order");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("0");
  const [reason, setReason] = useState("");
  const [submitMode, setSubmitMode] = useState<"draft" | "posted">("draft");

  const inventory = useQuery({
    queryKey: ["inventory-items-for-goods-receipts"],
    queryFn: async () => {
      const response = await fetch("/api/v1/inventory", { cache: "no-store" });
      const payload = (await response.json()) as { data?: InventoryItem[]; error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Inventory items could not be loaded.");
      }
      return payload.data ?? [];
    }
  });

  const warehouses = useQuery({
    queryKey: ["warehouses-for-goods-receipts"],
    queryFn: async () => {
      const response = await fetch("/api/v1/workflows/warehouses", { cache: "no-store" });
      const payload = (await response.json()) as { data?: { records?: Warehouse[] }; error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Warehouses could not be loaded.");
      }
      return payload.data?.records ?? [];
    }
  });

  const goodsReceipts = useQuery({
    queryKey: ["goods-receipts", search],
    queryFn: async () => {
      const params = new URLSearchParams({ movement_type: "receipt" });
      if (search) params.set("search", search);
      const response = await fetch(`/api/v1/operations/stock-control?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json()) as { data?: ReceiptPayload; error?: { message?: string } };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Goods receipts could not be loaded.");
      }
      return payload.data;
    }
  });

  const selectedItem = useMemo(() => (inventory.data ?? []).find((item) => item.id === itemId) ?? null, [inventory.data, itemId]);

  const createReceipt = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/v1/operations/stock-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: itemId,
          warehouse_id: warehouseId,
          movement_type: "receipt",
          source_type: sourceType,
          quantity: Number(quantity || 0),
          unit_cost: Number(unitCost || 0),
          reason: reason || `Goods receipt from ${sourceType}`,
          status: submitMode
        })
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "Goods receipt could not be created.");
    },
    onSuccess: async () => {
      toast.success("Goods receipt saved.");
      setQuantity("1");
      setReason("");
      setSourceType("purchase_order");
      setSubmitMode("draft");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["goods-receipts"] }),
        queryClient.invalidateQueries({ queryKey: ["inventory-items-for-goods-receipts"] })
      ]);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Goods receipt could not be created.")
  });

  const updateReceipt = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: GoodsReceiptRecord["status"] }) => {
      const response = await fetch(`/api/v1/operations/stock-control/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "Goods receipt update failed.");
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["goods-receipts"] }),
        queryClient.invalidateQueries({ queryKey: ["inventory-items-for-goods-receipts"] })
      ]);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Goods receipt update failed.")
  });

  const summary = goodsReceipts.data?.summary ?? {
    total: 0,
    draft: 0,
    posted: 0,
    tracked_value: 0,
    low_stock_items: 0
  };
  const records = goodsReceipts.data?.records ?? [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-5">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Total receipts</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.total}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Draft</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.draft}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Posted</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.posted}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Receipt value</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.tracked_value.toLocaleString("en-IN")}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Low stock items</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.low_stock_items}</CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>Create goods receipt</CardTitle>
          <Button asChild variant="secondary"><Link href="/purchase-orders">Open purchase orders</Link></Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label htmlFor="grn-item">Inventory item</Label>
              <select id="grn-item" value={itemId} onChange={(event) => {
                const nextItemId = event.target.value;
                setItemId(nextItemId);
                const nextItem = (inventory.data ?? []).find((item) => item.id === nextItemId);
                if (nextItem) {
                  setUnitCost(String(Number(nextItem.purchase_price ?? 0)));
                }
              }} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">Select item</option>
                {(inventory.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.sku} - {item.name}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="grn-warehouse">Warehouse</Label>
              <select id="grn-warehouse" value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">Select warehouse</option>
                {(warehouses.data ?? []).map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.code ?? warehouse.name ?? warehouse.id}</option>)}
              </select>
            </div>
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
            <div>
              <Label htmlFor="grn-mode">Save mode</Label>
              <select id="grn-mode" value={submitMode} onChange={(event) => setSubmitMode(event.target.value as "draft" | "posted")} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="draft">Save as draft</option>
                <option value="posted">Post now</option>
              </select>
            </div>
            <div className="lg:col-span-3">
              <Label htmlFor="grn-reason">Reason</Label>
              <Input id="grn-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Receipt against approved PO" />
            </div>
            {selectedItem ? <div className="lg:col-span-3 rounded-lg border p-3 text-sm text-muted-foreground">Current on hand: {Number(selectedItem.quantity_on_hand ?? 0).toLocaleString("en-IN")} | Reorder point: {Number(selectedItem.reorder_point ?? 0).toLocaleString("en-IN")}</div> : null}
            <div className="lg:col-span-3 flex justify-end">
              <Button onClick={() => createReceipt.mutate()} disabled={createReceipt.isPending || !itemId || !warehouseId || Number(quantity) <= 0}>
                {createReceipt.isPending ? "Saving..." : "Save receipt"}
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
                    <p className="font-semibold">{record.item?.name ?? "Goods receipt"}</p>
                    <Badge tone={statusTone(record.status)}>{record.status}</Badge>
                    <Badge tone="info">{record.source_type || "manual"}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span>SKU: {record.item?.sku ?? "-"}</span>
                    <span>Warehouse: {record.warehouse?.code ?? record.warehouse?.name ?? "-"}</span>
                    <span>Qty: {Number(record.quantity).toLocaleString("en-IN")}</span>
                    <span>Unit cost: {Number(record.unit_cost).toLocaleString("en-IN")}</span>
                    <span>On hand: {Number(record.item?.quantity_on_hand ?? 0).toLocaleString("en-IN")}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{record.reason || "Goods receipt"}</p>
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

