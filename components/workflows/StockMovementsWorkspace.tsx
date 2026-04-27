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

type StockMovementRecord = {
  id: string;
  movement_type: string;
  quantity: number;
  unit_cost: number;
  status: string;
  reason?: string | null;
  created_at?: string;
};

export function StockMovementsWorkspace() {
  const queryClient = useQueryClient();
  const [movementType, setMovementType] = useState("adjustment");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("0");
  const [reason, setReason] = useState("");

  const movements = useQuery({
    queryKey: ["workflow-stock-movements"],
    queryFn: async () => {
      const response = await fetch("/api/v1/workflows/stock-movements");
      const payload = (await response.json()) as { data?: { records?: StockMovementRecord[] }; error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Stock movements could not be loaded.");
      }
      return payload.data?.records ?? [];
    }
  });

  const createMovement = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/v1/workflows/stock-movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movement_type: movementType,
          quantity: Number(quantity || 0),
          unit_cost: Number(unitCost || 0),
          reason: reason || null
        })
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Stock movement could not be created.");
      }
    },
    onSuccess: async () => {
      setQuantity("1");
      setUnitCost("0");
      setReason("");
      toast.success("Stock movement created.");
      await queryClient.invalidateQueries({ queryKey: ["workflow-stock-movements"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Stock movement could not be created.");
    }
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "posted" | "cancelled" }) => {
      const response = await fetch(`/api/v1/workflows/stock-movements/${id}`, {
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
      await queryClient.invalidateQueries({ queryKey: ["workflow-stock-movements"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Stock movement could not be updated.");
    }
  });

  const metrics = useMemo(() => {
    const rows = movements.data ?? [];
    return {
      total: rows.length,
      draft: rows.filter((row) => row.status === "draft").length,
      posted: rows.filter((row) => row.status === "posted").length,
      value: rows.reduce((sum, row) => sum + Number(row.quantity ?? 0) * Number(row.unit_cost ?? 0), 0)
    };
  }, [movements.data]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Movements</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.total}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Draft</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.draft}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Posted</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.posted}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Tracked value</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.value.toLocaleString("en-IN")}</CardContent></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader><CardTitle>Movement Log</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(movements.data ?? []).length === 0 ? (
              <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">No stock movements yet. Create a transfer, adjustment, receipt, or dispatch event.</div>
            ) : (
              (movements.data ?? []).map((movement) => (
                <div key={movement.id} className="rounded-2xl border p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-semibold">{movement.movement_type} · Qty {movement.quantity}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{movement.reason || "No reason recorded"} · Unit cost {movement.unit_cost}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={movement.status === "posted" ? "success" : movement.status === "cancelled" ? "warning" : "info"}>{movement.status}</Badge>
                      {movement.status !== "posted" ? <Button variant="secondary" onClick={() => updateStatus.mutate({ id: movement.id, status: "posted" })}>Post</Button> : null}
                      {movement.status !== "cancelled" ? <Button variant="secondary" onClick={() => updateStatus.mutate({ id: movement.id, status: "cancelled" })}>Cancel</Button> : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Create Movement</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label htmlFor="movement-type">Movement type</Label><select id="movement-type" value={movementType} onChange={(event) => setMovementType(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="receipt">receipt</option><option value="issue">issue</option><option value="transfer">transfer</option><option value="adjustment">adjustment</option><option value="dispatch">dispatch</option></select></div>
              <div><Label htmlFor="movement-qty">Quantity</Label><Input id="movement-qty" type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></div>
              <div><Label htmlFor="movement-cost">Unit cost</Label><Input id="movement-cost" type="number" step="0.01" value={unitCost} onChange={(event) => setUnitCost(event.target.value)} /></div>
              <div><Label htmlFor="movement-reason">Reason</Label><Input id="movement-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Physical count adjustment" /></div>
              <Button onClick={() => createMovement.mutate()} disabled={createMovement.isPending}>{createMovement.isPending ? "Creating..." : "Create movement"}</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Connected Flows</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild variant="secondary"><Link href="/goods-receipts">GRN</Link></Button>
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
