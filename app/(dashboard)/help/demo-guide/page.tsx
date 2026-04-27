import { ClientDemoGuideView } from "@/components/help/ClientDemoGuideView";
import { PageHeader } from "@/components/shared/PageHeader";

export default function DemoGuidePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Client Demo Guide"
        description="A page-by-page walkthrough for showing QuikFinance to a client, including the demo order and the explanation for each core workflow."
      />
      <ClientDemoGuideView />
    </div>
  );
}
