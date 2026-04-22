import { DetailPage } from "@/components/shared/DetailPage";
import { getModuleConfig } from "@/lib/modules";

export default function SalesOrderDetailPage({ params }: { params: { id: string } }) {
  return <DetailPage config={getModuleConfig("sales-orders")} id={params.id} />;
}
