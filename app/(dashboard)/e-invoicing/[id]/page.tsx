import { EInvoicingDetail } from "@/components/operations/EInvoicingDetail";

export default function EInvoicingDetailPage({ params }: { params: { id: string } }) {
  return <EInvoicingDetail id={params.id} />;
}
