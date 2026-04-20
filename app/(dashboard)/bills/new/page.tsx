import { FormPage } from "@/components/shared/FormPage";
import { getModuleConfig } from "@/lib/modules";

export default function NewBillPage() {
  return <FormPage config={getModuleConfig("bills")} />;
}
