import { FormPage } from "@/components/shared/FormPage";
import { getModuleConfig } from "@/lib/modules";

export default function NewDeliveryDispatchPage() {
  return <FormPage config={getModuleConfig("delivery-dispatch")} />;
}
