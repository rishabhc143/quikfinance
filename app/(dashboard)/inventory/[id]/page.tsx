import { DetailPage } from "@/components/shared/DetailPage";
import { getModuleConfig } from "@/lib/modules";

export default function InventoryDetailPage({ params }: { params: { id: string } }) {
  return <DetailPage config={getModuleConfig("inventory")} id={params.id} />;
}
