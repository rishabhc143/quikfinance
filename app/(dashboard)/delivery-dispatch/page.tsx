import { ModulePage } from "@/components/shared/ModulePage";
import { getModuleConfig } from "@/lib/modules";

export default function DeliveryDispatchPage() {
  return <ModulePage config={getModuleConfig("delivery-dispatch")} />;
}
