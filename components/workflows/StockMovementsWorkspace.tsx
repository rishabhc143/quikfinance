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

type StockMovementRecord = {
  id: string;
  movement_type: "receipt" | "issue" | "transfer" | "adjustment" | "dispatch";
  quantity: number;
  unit_cost: number;
  status: "draft" | "posted" | "cancelled";
  reason?: string | null;
  source_type?: string | null;
  created_at?: string;
  item?: InventoryItem | null;
  warehouse?: Warehouse | null;
};

type StockControlPayload = {
  records: StockMovementRecord[];
  summary: {
    total: number;
    draft: number;
    posted: number;
    tracked_value: number;
    low_stock_items: number;
  };
};

function statusTone(status: StockMovementRecord["status"]) {
  if (status === "posted") return "success" as const;
  if (status === "cancelled") return "warning" as const;
  return "info" as const;
}

export function StockMovementsWorkspace() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [movementType, setMovementType] = useState<StockMovementRecord["movement_type"]>("adjustment");
  const [itemId, setItemId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("0");
  const [sourceType, setSourceType] = useState("manual_adjustment");
  const [reason, setReason] = useState("");
  const [submitMode, setSubmitMode] = useState<"draft" | "posted">("draft");

  const inventory = useQuery({
    queryKey: ["inventory-items-for-stock-control"],
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
    queryKey: ["warehouses-for-stock-control"],
    queryFn: async () => {
      const response = await fetch("/api/v1/workflows/warehouses", { cache: "no-store" });
      const payload = (await response.json()) as { data?: { records?: Warehouse[] }; error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Warehouses could not be loaded.");
      }
      return payload.data?.records ?? [];
    }
  });

  const movements = useQuery({
    queryKey: ["stock-control", search],
    queryFn: async () => {
      const query = search ? `?search=${encodeURIComponent(search)}` : "";
      const response = await fetch(`/api/v1/operations/stock-control${query}`, { cache: "no-store" });
      const payload = (await response.json()) as { data?: StockControlPayload; error?: { message?: string } };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Stock movements could not be loaded.");
      }
      return payload.data;
    }
  });

  const selectedItem = useMemo(() => (inventory.data ?? []).find((item) => item.id === itemId) ?? null, [inventory.data, itemId]);

  const createMovement = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/v1/operations/stock-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: itemId,
          warehouse_id: warehouseId,
          movement_type: movementType,
          quantity: Number(quantity || 0),
          unit_cost: Number(unitCost || 0),
          source_type: sourceType || null,
          reason: reason || null,
          status: submitMode
        })
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Stock movement could not be created.");
      }
    },
    onSuccess: async () => {
      setQuantity("1");
      setReason("");
      setSourceType("manual_adjustment");
      setSubmitMode("draft");
      toast.success("Stock movement saved.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["stock-control"] }),
        queryClient.invalidateQueries({ queryKey: ["inventory-items-for-stock-control"] })
      ]);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Stock movement could not be created.");
    }
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "posted" | "cancelled" }) => {
      const response = await fetch(`/api/v1/operations/stock-control/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Stock movement could not be updated.");
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["stock-control"] }),
        queryClient.invalidateQueries({ queryKey: ["inventory-items-for-stock-control"] })
      ]);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Stock movement could not be updated.");
    }
  });

  const summary = movements.data?.summary ?? {
    total: 0,
    draft: 0,
    posted: 0,
    tracked_value: 0,
    low_stock_items: 0
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Movements</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.total}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Draft</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.draft}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Posted</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.posted}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Tracked value</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.tracked_value.toLocaleString("en-IN")}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Low stock items</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.low_stock_items}</CardContent></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle>Movement log</CardTitle>
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reason or source type" className="md:max-w-xs" />
          </CardHeader>
          <CardContent className="space-y-3">
            {movements.isLoading ? <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Loading stock movements...</div> : null}
            {movements.isError ? <div className="rounded-xl border border-destructive/30 p-5 text-sm text-destructive">{(movements.error as Error).message}</div> : null}
            {!movements.isLoading && !movements.isError && (movements.data?.records ?? []).length === 0 ? (
              <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">No stock movements yet. Start with a receipt, issue, transfer, or physical adjustment.</div>
            ) : null}
            {(movements.data?.records ?? []).map((movement) => (
              <div key={movement.id} className="rounded-2xl border p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{movement.item?.name ?? "Unknown item"}</p>
                      <Badge tone={statusTone(movement.status)}>{movement.status}</Badge>
                      <Badge tone="info">{movement.movement_type}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span>SKU: {movement.item?.sku ?? "-"}</span>
                      <span>Warehouse: {movement.warehouse?.code ?? movement.warehouse?.name ?? "-"}</span>
                      <span>Qty: {Number(movement.quantity).toLocaleString("en-IN")}</span>
                      <span>Unit cost: {Number(movement.unit_cost ?? 0).toLocaleString("en-IN")}</span>
                      <span>On hand: {Number(movement.item?.quantity_on_hand ?? 0).toLocaleString("en-IN")}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{movement.reason || "No reason recorded."}{movement.source_type ? ` Source: ${movement.source_type}.` : ""}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {movement.status === "draft" ? <Button variant="secondary" onClick={() => updateStatus.mutate({ id: movement.id, status: "posted" })}>Post</Button> : null}
                    {movement.status !== "cancelled" ? <Button variant="ghost" onClick={() => updateStatus.mutate({ id: movement.id, status: "cancelled" })}>Cancel</Button> : null}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Create movement</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="stock-item">Inventory item</Label>
                <select id="stock-item" value={itemId} onChange={(event) => {
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
                <div className="mt-2 flex gap-3 text-xs">
                  <Link href="/inventory/new" className="text-primary underline underline-offset-2">New item</Link>
                  {itemId ? <Link href={`/inventory/${itemId}`} className="text-muted-foreground underline underline-offset-2">Open item</Link> : null}
                </div>
              </div>
              <div>
                <Label htmlFor="stock-warehouse">Warehouse</Label>
                <select id="stock-warehouse" value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
                  <option value="">Select warehouse</option>
                  {(warehouses.data ?? []).map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.code ?? warehouse.name ?? warehouse.id}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="movement-type">Movement type</Label>
                <select id="movement-type" value={movementType} onChange={(event) => setMovementType(event.target.value as StockMovementRecord["movement_type"])} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
                  <option value="receipt">receipt</option>
                  <option value="issue">issue</option>
                  <option value="transfer">transfer</option>
                  <option value="adjustment">adjustment</option>
                  <option value="dispatch">dispatch</option>
                </select>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div><Label htmlFor="movement-qty">Quantity</Label><Input id="movement-qty" type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></div>
                <div><Label htmlFor="movement-cost">Unit cost</Label><Input id="movement-cost" type="number" step="0.01" value={unitCost} onChange={(event) => setUnitCost(event.target.value)} /></div>
              </div>
              <div><Label htmlFor="movement-source">Source type</Label><Input id="movement-source" value={sourceType} onChange={(event) => setSourceType(event.target.value)} placeholder="purchase_order / manual_adjustment" /></div>
              <div><Label htmlFor="movement-reason">Reason</Label><Input id="movement-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Physical count correction" /></div>
              <div>
                <Label htmlFor="movement-submit-mode">Save mode</Label>
                <select id="movement-submit-mode" value={submitMode} onChange={(event) => setSubmitMode(event.target.value as "draft" | "posted")} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
                  <option value="draft">Save as draft</option>
                  <option value="posted">Post now</option>
                </select>
              </div>
              {selectedItem ? <div className="rounded-lg border p-3 text-sm text-muted-foreground">Current on hand: {Number(selectedItem.quantity_on_hand ?? 0).toLocaleString("en-IN")} | Reorder point: {Number(selectedItem.reorder_point ?? 0).toLocaleString("en-IN")}</div> : null}
              <Button onClick={() => createMovement.mutate()} disabled={createMovement.isPending || !itemId || !warehouseId || Number(quantity) === 0}>{createMovement.isPending ? "Saving..." : "Save movement"}</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Connected flows</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild variant="secondary"><Link href="/goods-receipts">Goods receipts</Link></Button>
              <Button asChild variant="secondary"><Link href="/sales-orders">Sales orders</Link></Button>
              <Button asChild variant="secondary"><Link href="/warehouses">Warehouses</Link></Button>
              <Button asChild variant="secondary"><Link href="/approvals">Approvals</Link></Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

