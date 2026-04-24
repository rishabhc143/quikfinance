import { FormPage } from "@/components/shared/FormPage";
import { getModuleConfig } from "@/lib/modules";

export default function NewCurrencyPage() {
  return <FormPage config={getModuleConfig("currencies")} />;
}
