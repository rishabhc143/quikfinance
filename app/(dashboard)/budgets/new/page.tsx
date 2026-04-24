import { FormPage } from "@/components/shared/FormPage";
import { getModuleConfig } from "@/lib/modules";

export default function NewBudgetPage() {
  return <FormPage config={getModuleConfig("budgets")} />;
}
