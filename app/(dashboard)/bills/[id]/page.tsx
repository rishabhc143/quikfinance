import { DocumentDetail } from "@/components/transactions/DocumentDetail";

export default function BillDetailPage({ params }: { params: { id: string } }) {
  return <DocumentDetail kind="bill" id={params.id} />;
}
