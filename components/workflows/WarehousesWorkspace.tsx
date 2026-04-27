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

type WarehouseRecord = {
  id: string;
  code: string;
  name: string;
  address?: { city?: string };
  is_active?: boolean;
  created_at?: string;
};

type InventoryRecord = {
  id: string;
  name?: string;
  quantity_on_hand?: number;
  reorder_point?: number;
};

export function WarehousesWorkspace() {
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");

  const warehouses = useQuery({
    queryKey: ["workflow-warehouses"],
    queryFn: async () => {
      const response = await fetch("/api/v1/workflows/warehouses");
      const payload = (await response.json()) as { data?: { records?: WarehouseRecord[] }; error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Warehouses could not be loaded.");
      }
      return payload.data?.records ?? [];
    }
  });

  const inventory = useQuery({
    queryKey: ["inventory-reorder"],
    queryFn: async () => {
      const response = await fetch("/api/v1/inventory");
      const payload = (await response.json()) as { data?: InventoryRecord[] };
      if (!response.ok) {
        return [];
      }
      return payload.data ?? [];
    }
  });

  const createWarehouse = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/v1/workflows/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code || undefined,
          name: name || undefined,
          address: { city: city || undefined }
        })
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Warehouse could not be created.");
      }
    },
    onSuccess: async () => {
      setCode("");
      setName("");
      setCity("");
      toast.success("Warehouse created.");
      await queryClient.invalidateQueries({ queryKey: ["workflow-warehouses"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Warehouse could not be created.");
    }
  });

  const toggleWarehouse = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await fetch(`/api/v1/workflows/warehouses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: isActive })
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Warehouse status could not be updated.");
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["workflow-warehouses"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Warehouse status could not be updated.");
    }
  });

  const metrics = useMemo(() => {
    const rows = warehouses.data ?? [];
    const lowStock = (inventory.data ?? []).filter((item) => Number(item.quantity_on_hand ?? 0) <= Number(item.reorder_point ?? 0));
    return {
      total: rows.length,
      active: rows.filter((row) => row.is_active !== false).length,
      lowStock: lowStock.length,
      transferCandidates: Math.max(rows.length - 1, 0)
    };
  }, [inventory.data, warehouses.data]);

  const lowStockItems = useMemo(
    () => (inventory.data ?? []).filter((item) => Number(item.quantity_on_hand ?? 0) <= Number(item.reorder_point ?? 0)).slice(0, 5),
    [inventory.data]
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Locations</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.total}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Active sites</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.active}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Low-stock items</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.lowStock}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Transfer candidates</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.transferCandidates}</CardContent></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader><CardTitle>Warehouse Locations</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(warehouses.data ?? []).length === 0 ? (
              <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">No warehouse locations yet. Create the first location for inventory and transfer control.</div>
            ) : (
              (warehouses.data ?? []).map((warehouse) => (
                <div key={warehouse.id} className="rounded-2xl border p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold">{warehouse.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {warehouse.code}{warehouse.address?.city ? ` · ${warehouse.address.city}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={warehouse.is_active === false ? "warning" : "success"}>{warehouse.is_active === false ? "inactive" : "active"}</Badge>
                      <Button
                        variant="secondary"
                        onClick={() => toggleWarehouse.mutate({ id: warehouse.id, isActive: warehouse.is_active === false })}
                        disabled={toggleWarehouse.isPending}
                      >
                        {warehouse.is_active === false ? "Activate" : "Pause"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Create Warehouse</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label htmlFor="warehouse-code">Code</Label><Input id="warehouse-code" value={code} onChange={(event) => setCode(event.target.value)} placeholder="MAIN" /></div>
              <div><Label htmlFor="warehouse-name">Name</Label><Input id="warehouse-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Main Warehouse" /></div>
              <div><Label htmlFor="warehouse-city">City</Label><Input id="warehouse-city" value={city} onChange={(event) => setCity(event.target.value)} placeholder="Indore" /></div>
              <Button onClick={() => createWarehouse.mutate()} disabled={createWarehouse.isPending}>{createWarehouse.isPending ? "Creating..." : "Create warehouse"}</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Low-Stock Watchlist</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {lowStockItems.length === 0 ? (
                <div className="rounded-xl bg-muted/40 p-3 text-sm text-muted-foreground">No low-stock items right now.</div>
              ) : (
                lowStockItems.map((item) => (
                  <div key={item.id} className="rounded-xl border p-3">
                    <p className="font-medium">{item.name ?? item.id}</p>
                    <p className="mt-1 text-xs text-muted-foreground">On hand: {Number(item.quantity_on_hand ?? 0)} · Reorder point: {Number(item.reorder_point ?? 0)}</p>
                  </div>
                ))
              )}
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="secondary"><Link href="/inventory">Open items</Link></Button>
                <Button asChild variant="secondary"><Link href="/purchase-orders/new">Create purchase order</Link></Button>
                <Button asChild variant="secondary"><Link href="/stock-movements">Stock movements</Link></Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
