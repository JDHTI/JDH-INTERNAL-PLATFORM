import { notFound } from "next/navigation";

import SequenceDetail from "@/features/dwh-monitoring/components/sequence-detail";
import { DWH_SEGMENT, isAvailableModule } from "@/shared/config/areas.config";

export default async function DatawarehouseSequencePage({
  params,
}: {
  params: Promise<{ area: string; secuencia: string }>;
}) {
  const { area, secuencia } = await params;
  if (!isAvailableModule(area, DWH_SEGMENT)) notFound();

  return <SequenceDetail area={area} secuencia={decodeURIComponent(secuencia)} />;
}
