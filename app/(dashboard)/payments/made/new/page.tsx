import { FormPage } from "@/components/shared/FormPage";
import { getModuleConfig } from "@/lib/modules";

export default function NewMadePaymentPage() {
  return <FormPage config={getModuleConfig("payments-made")} />;
}
