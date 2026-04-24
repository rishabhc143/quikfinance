import { DocumentDetail } from "@/components/transactions/DocumentDetail";

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  return <DocumentDetail kind="invoice" id={params.id} />;
}
