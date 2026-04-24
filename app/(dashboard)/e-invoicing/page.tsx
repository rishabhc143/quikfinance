import { ModulePage } from "@/components/shared/ModulePage";
import { getModuleConfig } from "@/lib/modules";

export default function EInvoicingPage() {
  return <ModulePage config={getModuleConfig("e-invoicing")} />;
}
