import { PageHeader } from "@/components/shared/PageHeader";
import { EWayBillEditor } from "@/components/operations/EWayBillEditor";

export default function NewEWayBillPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="New E-Way Bill" description="Create or adjust an e-way bill record with transport, dispatch, and GST movement details." />
      <EWayBillEditor />
    </div>
  );
}
