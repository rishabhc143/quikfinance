import { IntegrationsWorkspace } from "@/components/integrations/IntegrationsWorkspace";
import { PageHeader } from "@/components/shared/PageHeader";

export default function IntegrationsPage() {
  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title="Integrations" description="Operational connectors for collections, imports, webhooks, and bank-feed activity." />
      <IntegrationsWorkspace />
    </div>
  );
}
