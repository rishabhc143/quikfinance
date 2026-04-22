import { DetailPage } from "@/components/shared/DetailPage";
import { getModuleConfig } from "@/lib/modules";

export default function VendorCreditDetailPage({ params }: { params: { id: string } }) {
  return <DetailPage config={getModuleConfig("vendor-credits")} id={params.id} />;
}
