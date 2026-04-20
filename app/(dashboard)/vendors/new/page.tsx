import { FormPage } from "@/components/shared/FormPage";
import { getModuleConfig } from "@/lib/modules";

export default function NewVendorPage() {
  return <FormPage config={getModuleConfig("vendors")} />;
}
