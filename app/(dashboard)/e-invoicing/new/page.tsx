import { FormPage } from "@/components/shared/FormPage";
import { getModuleConfig } from "@/lib/modules";

export default function NewEInvoicingPage() {
  return <FormPage config={getModuleConfig("e-invoicing")} />;
}
