import { FormPage } from "@/components/shared/FormPage";
import { getModuleConfig } from "@/lib/modules";

export default function NewReceivedPaymentPage() {
  return <FormPage config={getModuleConfig("payments-received")} />;
}
