import ExtractionsBrowser from "@/features/dwh-monitoring/components/extractions-browser";
import { requireModule } from "@/features/areas/server/area-access";
import { DWH_SEGMENT } from "@/shared/config/areas.config";

export default async function DatawarehouseExtractionsPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  await requireModule(area, DWH_SEGMENT);

  return <ExtractionsBrowser />;
}
