import { DocumentDetail } from "@/components/transactions/DocumentDetail";

export default function QuotationDetailPage({ params }: { params: { id: string } }) {
  return <DocumentDetail kind="quotation" id={params.id} />;
}
