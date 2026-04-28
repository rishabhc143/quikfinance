import { DocumentDetail } from "@/components/transactions/DocumentDetail";

export default function CreditNoteDetailPage({ params }: { params: { id: string } }) {
  return <DocumentDetail kind="credit-note" id={params.id} />;
}
