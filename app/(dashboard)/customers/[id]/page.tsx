import { DetailPage } from "@/components/shared/DetailPage";
import { getModuleConfig } from "@/lib/modules";

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  return <DetailPage config={getModuleConfig("customers")} id={params.id} />;
}
