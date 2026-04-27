import { PageHeader } from "@/components/shared/PageHeader";
import { EWayBillWorkspace } from "@/components/workflows/EWayBillWorkspace";

export default function EWayBillPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="E-Way Bill" description="Review dispatch readiness, transport data, and GST-linked shipment prerequisites in a dedicated compliance view." />
      <EWayBillWorkspace />
    </div>
  );
}
