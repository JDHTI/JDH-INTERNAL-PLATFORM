import { notFound } from "next/navigation";

import ExtractionsBrowser from "@/features/dwh-monitoring/components/extractions-browser";
import { DWH_SEGMENT, isAvailableModule } from "@/shared/config/areas.config";

export default async function DatawarehouseExtractionsPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  if (!isAvailableModule(area, DWH_SEGMENT)) notFound();

  return <ExtractionsBrowser />;
}
