import { notFound } from "next/navigation";

import ScheduleView from "@/features/dwh-monitoring/components/schedule-view";
import { DWH_SEGMENT, isAvailableModule } from "@/shared/config/areas.config";

export default async function DatawarehouseSchedulePage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  if (!isAvailableModule(area, DWH_SEGMENT)) notFound();

  return <ScheduleView area={area} />;
}
