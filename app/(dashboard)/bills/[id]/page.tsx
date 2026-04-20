import { DetailPage } from "@/components/shared/DetailPage";
import { getModuleConfig } from "@/lib/modules";

export default function BillDetailPage({ params }: { params: { id: string } }) {
  return <DetailPage config={getModuleConfig("bills")} id={params.id} />;
}
