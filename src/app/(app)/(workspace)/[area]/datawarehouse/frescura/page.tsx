import FreshnessBrowser from "@/features/dwh-monitoring/components/freshness-browser";
import { requireModule } from "@/features/areas/server/area-access";
import { DWH_SEGMENT } from "@/shared/config/areas.config";

export default async function DatawarehouseFreshnessPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  await requireModule(area, DWH_SEGMENT);

  return <FreshnessBrowser />;
}
