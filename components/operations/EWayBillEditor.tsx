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

type Option = { id: string; dispatch_number?: string; invoice_number?: string };

export function EWayBillEditor() {
  const router = useRouter();
  const [editId, setEditId] = useState<string | null>(null);
  const [dispatches, setDispatches] = useState<Option[]>([]);
  const [invoices, setInvoices] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dispatchId, setDispatchId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [generatedOn, setGeneratedOn] = useState(todayISO());
  const [transportMode, setTransportMode] = useState("road");
  const [transporterName, setTransporterName] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [distanceKm, setDistanceKm] = useState(0);
  const [taxableValue, setTaxableValue] = useState(0);
  const [totalTax, setTotalTax] = useState(0);
  const [validUntil, setValidUntil] = useState("");
  const [status, setStatus] = useState("draft");
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
        const [dispatchRes, invoiceRes, detailRes] = await Promise.all([
          fetch("/api/v1/delivery-dispatch", { signal: controller.signal }),
          fetch("/api/v1/invoices", { signal: controller.signal }),
          editId ? fetch(`/api/v1/e-way-bills/${editId}`, { signal: controller.signal }) : Promise.resolve(null)
        ]);
        const dispatchJson = await dispatchRes.json().catch(() => ({ data: [] }));
        const invoiceJson = await invoiceRes.json().catch(() => ({ data: [] }));
        setDispatches(Array.isArray(dispatchJson.data) ? dispatchJson.data : []);
        setInvoices(Array.isArray(invoiceJson.data) ? invoiceJson.data : []);
        if (detailRes) {
          const detailJson = await detailRes.json().catch(() => ({}));
          if (!detailRes.ok) throw new Error(detailJson.error?.message ?? "E-Way Bill could not be loaded.");
          const record = detailJson.data ?? {};
          setDispatchId(String(record.dispatch_id ?? ""));
          setInvoiceId(String(record.invoice_id ?? ""));
          setDocumentNumber(String(record.document_number ?? ""));
          setGeneratedOn(String(record.generated_on ?? todayISO()));
          setTransportMode(String(record.transport_mode ?? "road"));
          setTransporterName(String(record.transporter_name ?? ""));
          setVehicleNumber(String(record.vehicle_number ?? ""));
          setTrackingNumber(String(record.tracking_number ?? ""));
          setDistanceKm(Number(record.distance_km ?? 0));
          setTaxableValue(Number(record.taxable_value ?? 0));
          setTotalTax(Number(record.total_tax ?? 0));
          setValidUntil(String(record.valid_until ?? ""));
          setStatus(String(record.status ?? "draft"));
          setNotes(String(record.notes ?? ""));
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "E-Way Bill could not be loaded.");
      } finally {
        setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [editId]);

  const submit = async () => {
    if (!generatedOn) {
      toast.error("Generated date is required.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(editId ? `/api/v1/e-way-bills/${editId}` : "/api/v1/e-way-bills", {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dispatch_id: dispatchId || null,
          invoice_id: invoiceId || null,
          document_number: documentNumber || undefined,
          generated_on: generatedOn,
          transport_mode: transportMode,
          transporter_name: transporterName || null,
          vehicle_number: vehicleNumber || null,
          tracking_number: trackingNumber || null,
          distance_km: distanceKm,
          taxable_value: taxableValue,
          total_tax: totalTax,
          valid_until: validUntil || null,
          status,
          notes: notes || null
        })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error?.message ?? "E-Way Bill could not be saved.");
      toast.success("E-Way Bill saved.");
      router.push(json.data?.id ? `/e-way-bill/${json.data.id}` : "/e-way-bill");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "E-Way Bill could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading E-Way Bill editor...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>{editId ? "Edit E-Way Bill" : "New E-Way Bill"}</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Dispatch</Label>
            <select value={dispatchId} onChange={(event) => setDispatchId(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="">Optional dispatch link</option>
              {dispatches.map((entry) => <option key={entry.id} value={entry.id}>{entry.dispatch_number ?? entry.id}</option>)}
            </select>
          </div>
          <div>
            <Label>Invoice</Label>
            <select value={invoiceId} onChange={(event) => setInvoiceId(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="">Optional invoice link</option>
              {invoices.map((entry) => <option key={entry.id} value={entry.id}>{entry.invoice_number ?? entry.id}</option>)}
            </select>
          </div>
          <div>
            <Label>Document number</Label>
            <Input value={documentNumber} onChange={(event) => setDocumentNumber(event.target.value)} className="mt-2" />
          </div>
          <div>
            <Label>Generated on</Label>
            <Input type="date" value={generatedOn} onChange={(event) => setGeneratedOn(event.target.value)} className="mt-2" />
          </div>
          <div>
            <Label>Transport mode</Label>
            <select value={transportMode} onChange={(event) => setTransportMode(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
              {['road', 'rail', 'air', 'ship'].map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div>
            <Label>Status</Label>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
              {['draft', 'ready', 'generated', 'expired', 'cancelled'].map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div>
            <Label>Transporter</Label>
            <Input value={transporterName} onChange={(event) => setTransporterName(event.target.value)} className="mt-2" />
          </div>
          <div>
            <Label>Vehicle number</Label>
            <Input value={vehicleNumber} onChange={(event) => setVehicleNumber(event.target.value)} className="mt-2" />
          </div>
          <div>
            <Label>Tracking number</Label>
            <Input value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} className="mt-2" />
          </div>
          <div>
            <Label>Distance (km)</Label>
            <Input type="number" step="0.01" value={distanceKm} onChange={(event) => setDistanceKm(Number(event.target.value || 0))} className="mt-2" />
          </div>
          <div>
            <Label>Taxable value</Label>
            <Input type="number" step="0.01" value={taxableValue} onChange={(event) => setTaxableValue(Number(event.target.value || 0))} className="mt-2" />
          </div>
          <div>
            <Label>Total tax</Label>
            <Input type="number" step="0.01" value={totalTax} onChange={(event) => setTotalTax(Number(event.target.value || 0))} className="mt-2" />
          </div>
          <div className="md:col-span-2">
            <Label>Valid until</Label>
            <Input type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} className="mt-2" />
          </div>
          <div className="md:col-span-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-2" />
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => router.push('/e-way-bill')}>Cancel</Button>
        <Button type="button" onClick={submit} disabled={saving}>{saving ? 'Saving...' : 'Save E-Way Bill'}</Button>
      </div>
    </div>
  );
}
