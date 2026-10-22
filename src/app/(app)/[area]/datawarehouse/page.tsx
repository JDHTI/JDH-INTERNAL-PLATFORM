import { notFound } from "next/navigation";

import Overview from "@/features/dwh-monitoring/components/overview";
import { DWH_SEGMENT, isAvailableModule } from "@/shared/config/areas.config";

export default async function DatawarehousePage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  if (!isAvailableModule(area, DWH_SEGMENT)) notFound();

  return <Overview area={area} />;
}
