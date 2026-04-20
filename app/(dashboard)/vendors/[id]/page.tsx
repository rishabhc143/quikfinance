import { DetailPage } from "@/components/shared/DetailPage";
import { getModuleConfig } from "@/lib/modules";

export default function VendorDetailPage({ params }: { params: { id: string } }) {
  return <DetailPage config={getModuleConfig("vendors")} id={params.id} />;
}
