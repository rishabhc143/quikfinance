import { DocumentDetail } from "@/components/transactions/DocumentDetail";

export default function SalesOrderDetailPage({ params }: { params: { id: string } }) {
  return <DocumentDetail kind="sales-order" id={params.id} />;
}
