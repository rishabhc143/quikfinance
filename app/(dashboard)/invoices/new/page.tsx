import { FormPage } from "@/components/shared/FormPage";
import { getModuleConfig } from "@/lib/modules";

export default function NewInvoicePage() {
  return <FormPage config={getModuleConfig("invoices")} />;
}
