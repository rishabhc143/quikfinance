import { FormPage } from "@/components/shared/FormPage";
import { getModuleConfig } from "@/lib/modules";

export default function NewQuotationPage() {
  return <FormPage config={getModuleConfig("quotations")} />;
}
