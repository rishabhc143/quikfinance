import { PortalManager } from "@/components/portals/PortalManager";
import { PageHeader } from "@/components/shared/PageHeader";

export default function PortalsSettingsPage() {
  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title="Portals" description="Create secure customer and CA portal links for external collaboration." />
      <PortalManager />
    </div>
  );
}
