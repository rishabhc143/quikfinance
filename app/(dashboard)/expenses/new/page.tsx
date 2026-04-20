import { FormPage } from "@/components/shared/FormPage";
import { getModuleConfig } from "@/lib/modules";

export default function NewExpensePage() {
  return <FormPage config={getModuleConfig("expenses")} />;
}
