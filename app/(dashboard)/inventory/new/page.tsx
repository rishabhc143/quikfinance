import { FormPage } from "@/components/shared/FormPage";
import { getModuleConfig } from "@/lib/modules";

export default function NewInventoryItemPage() {
  return <FormPage config={getModuleConfig("inventory")} />;
}
