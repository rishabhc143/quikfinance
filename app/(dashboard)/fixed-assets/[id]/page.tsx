import { FixedAssetDetail } from "@/components/operations/FixedAssetDetail";

export default function FixedAssetDetailPage({ params }: { params: { id: string } }) {
  return <FixedAssetDetail id={params.id} />;
}
