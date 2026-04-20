import { FormPage } from "@/components/shared/FormPage";
import { getModuleConfig } from "@/lib/modules";

export default function NewCustomerPage() {
  return <FormPage config={getModuleConfig("customers")} />;
}
