import { PageHeader } from "@/components/shared/PageHeader";
import { EWayBillDetail } from "@/components/operations/EWayBillDetail";

export default function EWayBillDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-6">
      <PageHeader title="E-Way Bill" description="Review document validity, transport details, and dispatch linkage." />
      <EWayBillDetail id={params.id} />
    </div>
  );
}
