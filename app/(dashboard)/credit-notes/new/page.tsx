import { FormPage } from "@/components/shared/FormPage";
import { getModuleConfig } from "@/lib/modules";

export default function NewCreditNotePage() {
  return <FormPage config={getModuleConfig("credit-notes")} />;
}
