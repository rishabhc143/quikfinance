import { FormPage } from "@/components/shared/FormPage";
import { getModuleConfig } from "@/lib/modules";

export default function NewPurchaseOrderPage() {
  return <FormPage config={getModuleConfig("purchase-orders")} />;
}
