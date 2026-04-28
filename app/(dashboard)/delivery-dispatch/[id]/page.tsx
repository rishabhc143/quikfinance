import { DeliveryDispatchDetail } from "@/components/operations/DeliveryDispatchDetail";

export default function DeliveryDispatchDetailPage({ params }: { params: { id: string } }) {
  return <DeliveryDispatchDetail id={params.id} />;
}
