import { PageHeader } from "@/components/shared/PageHeader";
import { WarehousesWorkspace } from "@/components/workflows/WarehousesWorkspace";

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader title="Warehouses" description="Manage stock locations, reorder watchlists, and warehouse activation with a dedicated inventory operations view." />
      <WarehousesWorkspace />
    </div>
  );
}

