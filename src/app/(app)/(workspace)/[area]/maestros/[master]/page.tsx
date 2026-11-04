import { notFound } from "next/navigation";

import CommercialMasterTable from "@/features/commercial-masters/components/commercial-master-table";
import { findCommercialMaster } from "@/features/commercial-masters/config/masters.config";
import { isAvailableModule } from "@/shared/config/areas.config";

export default async function MaestroPage({
  params,
}: {
  params: Promise<{ area: string; master: string }>;
}) {
  const { area, master: key } = await params;
  const master = findCommercialMaster(key);
  if (!master || !isAvailableModule(area, "maestros")) notFound();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{master.name}</h1>
        <p className="text-sm text-text-secondary">{master.description}</p>
      </div>
      {/* Keyed so paging and search start over when the dropdown changes master. */}
      <CommercialMasterTable key={master.key} masterKey={master.key} />
    </div>
  );
}
