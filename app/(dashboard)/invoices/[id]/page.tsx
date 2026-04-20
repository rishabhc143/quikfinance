import { DetailPage } from "@/components/shared/DetailPage";
import { getModuleConfig } from "@/lib/modules";

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  return <DetailPage config={getModuleConfig("invoices")} id={params.id} />;
}
