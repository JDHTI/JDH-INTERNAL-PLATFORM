import ScheduleView from "@/features/dwh-monitoring/components/schedule-view";
import { requireModule } from "@/features/areas/server/area-access";
import { DWH_SEGMENT } from "@/shared/config/areas.config";

export default async function DatawarehouseSchedulePage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  await requireModule(area, DWH_SEGMENT);

  return <ScheduleView area={area} />;
}
