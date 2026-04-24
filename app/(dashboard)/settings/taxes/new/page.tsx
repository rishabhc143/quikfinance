import { FormPage } from "@/components/shared/FormPage";
import { getModuleConfig } from "@/lib/modules";

export default function NewTaxPage() {
  return <FormPage config={getModuleConfig("taxes")} />;
}
