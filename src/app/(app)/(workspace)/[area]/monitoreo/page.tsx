import { notFound } from "next/navigation";

import MonitoringBoard from "@/features/app-monitoring/components/monitoring-board";
import { BOARD_SEGMENT, isAvailableModule } from "@/shared/config/areas.config";

export default async function MonitoringBoardPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  if (!isAvailableModule(area, BOARD_SEGMENT)) notFound();

  return <MonitoringBoard area={area} />;
}
