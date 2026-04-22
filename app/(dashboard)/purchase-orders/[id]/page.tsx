import { DetailPage } from "@/components/shared/DetailPage";
import { getModuleConfig } from "@/lib/modules";

export default function PurchaseOrderDetailPage({ params }: { params: { id: string } }) {
  return <DetailPage config={getModuleConfig("purchase-orders")} id={params.id} />;
}
