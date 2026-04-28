import { DocumentDetail } from "@/components/transactions/DocumentDetail";

export default function PurchaseOrderDetailPage({ params }: { params: { id: string } }) {
  return <DocumentDetail kind="purchase-order" id={params.id} />;
}
