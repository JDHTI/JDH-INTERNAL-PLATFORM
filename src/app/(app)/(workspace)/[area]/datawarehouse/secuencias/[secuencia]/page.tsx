import SequenceDetail from "@/features/dwh-monitoring/components/sequence-detail";
import { requireModule } from "@/features/areas/server/area-access";
import { DWH_SEGMENT } from "@/shared/config/areas.config";

export default async function DatawarehouseSequencePage({
  params,
}: {
  params: Promise<{ area: string; secuencia: string }>;
}) {
  const { area, secuencia } = await params;
  await requireModule(area, DWH_SEGMENT);

  return <SequenceDetail area={area} secuencia={decodeURIComponent(secuencia)} />;
}
