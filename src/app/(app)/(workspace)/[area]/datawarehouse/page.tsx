import Overview from "@/features/dwh-monitoring/components/overview";
import { requireModule } from "@/features/areas/server/area-access";
import { DWH_SEGMENT } from "@/shared/config/areas.config";

export default async function DatawarehousePage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  await requireModule(area, DWH_SEGMENT);

  return <Overview area={area} />;
}
