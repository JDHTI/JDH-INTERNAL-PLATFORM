import { notFound } from "next/navigation";

import FreshnessBrowser from "@/features/dwh-monitoring/components/freshness-browser";
import { DWH_SEGMENT, isAvailableModule } from "@/shared/config/areas.config";

export default async function DatawarehouseFreshnessPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  if (!isAvailableModule(area, DWH_SEGMENT)) notFound();

  return <FreshnessBrowser />;
}
