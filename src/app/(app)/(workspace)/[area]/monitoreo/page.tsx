import MonitoringBoard from "@/features/app-monitoring/components/monitoring-board";
import { requireModule } from "@/features/areas/server/area-access";
import { BOARD_SEGMENT } from "@/shared/config/areas.config";

export default async function MonitoringBoardPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  await requireModule(area, BOARD_SEGMENT);

  return <MonitoringBoard area={area} />;
}
