import { DetailPage } from "@/components/shared/DetailPage";
import { getModuleConfig } from "@/lib/modules";

export default function QuotationDetailPage({ params }: { params: { id: string } }) {
  return <DetailPage config={getModuleConfig("quotations")} id={params.id} />;
}
