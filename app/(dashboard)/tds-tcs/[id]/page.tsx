import { TdsTcsDetail } from "@/components/operations/TdsTcsDetail";

export default function TdsTcsDetailPage({ params }: { params: { id: string } }) {
  return <TdsTcsDetail id={params.id} />;
}
