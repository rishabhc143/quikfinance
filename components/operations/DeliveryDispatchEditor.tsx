"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { todayISO } from "@/lib/utils/dates";

type Option = { id: string; display_name?: string; sales_order_number?: string };
type WarehouseOption = { id: string; code?: string; name?: string };

export function DeliveryDispatchEditor() {
  const router = useRouter();
  const [editId, setEditId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Option[]>([]);
  const [salesOrders, setSalesOrders] = useState<Option[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dispatchNumber, setDispatchNumber] = useState("");
  const [salesOrderId, setSalesOrderId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [dispatchDate, setDispatchDate] = useState(todayISO());
  const [carrierName, setCarrierName] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [shippedValue, setShippedValue] = useState(0);
  const [status, setStatus] = useState("draft");
  const [proofStatus, setProofStatus] = useState("pending");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    setEditId(search.get("edit"));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const [customerRes, orderRes, warehouseRes, detailRes] = await Promise.all([
          fetch("/api/v1/customers", { signal: controller.signal }),
          fetch("/api/v1/sales-orders", { signal: controller.signal }),
          fetch("/api/v1/workflows/warehouses", { signal: controller.signal }),
          editId ? fetch(`/api/v1/delivery-dispatch/${editId}`, { signal: controller.signal }) : Promise.resolve(null)
        ]);
        const customerJson = await customerRes.json().catch(() => ({ data: [] }));
        const orderJson = await orderRes.json().catch(() => ({ data: [] }));
        const warehouseJson = await warehouseRes.json().catch(() => ({ records: [] }));
        setCustomers(Array.isArray(customerJson.data) ? customerJson.data : []);
        setSalesOrders(Array.isArray(orderJson.data) ? orderJson.data : []);
        setWarehouses(Array.isArray(warehouseJson.records) ? warehouseJson.records : []);
        if (detailRes) {
          const detailJson = await detailRes.json().catch(() => ({}));
          if (!detailRes.ok) throw new Error(detailJson.error?.message ?? "Dispatch could not be loaded.");
          const record = detailJson.data ?? {};
          setDispatchNumber(String(record.dispatch_number ?? ""));
          setSalesOrderId(String(record.sales_order_id ?? ""));
          setCustomerId(String(record.customer_id ?? ""));
          setWarehouseId(String(record.warehouse_id ?? ""));
          setDispatchDate(String(record.dispatch_date ?? todayISO()));
          setCarrierName(String(record.carrier_name ?? ""));
          setTrackingNumber(String(record.tracking_number ?? ""));
          setShippedValue(Number(record.shipped_value ?? 0));
          setStatus(String(record.status ?? "draft"));
          setProofStatus(String(record.proof_status ?? "pending"));
          setNotes(String(record.notes ?? ""));
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Dispatch could not be loaded.");
      } finally {
        setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [editId]);

  const submit = async () => {
    if (!carrierName.trim() || shippedValue < 0) {
      toast.error("Carrier name is required.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(editId ? `/api/v1/delivery-dispatch/${editId}` : "/api/v1/delivery-dispatch", {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dispatch_number: dispatchNumber || undefined,
          sales_order_id: salesOrderId || null,
          customer_id: customerId || null,
          warehouse_id: warehouseId || null,
          dispatch_date: dispatchDate,
          carrier_name: carrierName,
          tracking_number: trackingNumber || null,
          shipped_value: shippedValue,
          status,
          proof_status: proofStatus,
          notes: notes || null
        })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error?.message ?? "Dispatch could not be saved.");
      toast.success("Dispatch saved.");
      router.push(json.data?.id ? `/delivery-dispatch/${json.data.id}` : "/delivery-dispatch");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Dispatch could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading dispatch editor...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>{editId ? "Edit dispatch" : "New dispatch"}</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Dispatch number</Label>
            <Input value={dispatchNumber} onChange={(event) => setDispatchNumber(event.target.value)} className="mt-2" />
          </div>
          <div>
            <Label>Dispatch date</Label>
            <Input type="date" value={dispatchDate} onChange={(event) => setDispatchDate(event.target.value)} className="mt-2" />
          </div>
          <div>
            <Label>Sales order</Label>
            <select value={salesOrderId} onChange={(event) => setSalesOrderId(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="">Optional sales order</option>
              {salesOrders.map((order) => <option key={order.id} value={order.id}>{order.sales_order_number ?? order.id}</option>)}
            </select>
          </div>
          <div>
            <Label>Customer</Label>
            <select value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="">Optional customer</option>
              {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.display_name ?? customer.id}</option>)}
            </select>
            <div className="mt-2 flex gap-3 text-xs">
              <Link href="/customers/new" className="text-primary underline underline-offset-2">New customer</Link>
              {customerId ? <Link href={`/customers/${customerId}`} className="text-muted-foreground underline underline-offset-2">Open customer</Link> : null}
            </div>
          </div>
          <div>
            <Label>Warehouse</Label>
            <select value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="">Optional warehouse</option>
              {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.code || warehouse.name || warehouse.id}</option>)}
            </select>
          </div>
          <div>
            <Label>Shipped value</Label>
            <Input type="number" step="0.01" value={shippedValue} onChange={(event) => setShippedValue(Number(event.target.value || 0))} className="mt-2" />
          </div>
          <div>
            <Label>Carrier name</Label>
            <Input value={carrierName} onChange={(event) => setCarrierName(event.target.value)} className="mt-2" />
          </div>
          <div>
            <Label>Tracking number</Label>
            <Input value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} className="mt-2" />
          </div>
          <div>
            <Label>Status</Label>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
              {["draft", "packed", "shipped", "delivered", "cancelled"].map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div>
            <Label>Proof status</Label>
            <select value={proofStatus} onChange={(event) => setProofStatus(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
              {["pending", "received", "not_required"].map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-2" />
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => router.push("/delivery-dispatch")}>Cancel</Button>
        <Button type="button" onClick={submit} disabled={saving}>{saving ? "Saving..." : "Save dispatch"}</Button>
      </div>
    </div>
  );
}
