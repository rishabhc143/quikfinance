import { DocumentDetail } from "@/components/transactions/DocumentDetail";

export default function VendorCreditDetailPage({ params }: { params: { id: string } }) {
  return <DocumentDetail kind="vendor-credit" id={params.id} />;
}
