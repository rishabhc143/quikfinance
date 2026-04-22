import { FormPage } from "@/components/shared/FormPage";
import { getModuleConfig } from "@/lib/modules";

export default function NewSalesOrderPage() {
  return <FormPage config={getModuleConfig("sales-orders")} />;
}
