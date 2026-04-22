import { FormPage } from "@/components/shared/FormPage";
import { getModuleConfig } from "@/lib/modules";

export default function NewVendorCreditPage() {
  return <FormPage config={getModuleConfig("vendor-credits")} />;
}
