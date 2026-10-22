import { notFound } from "next/navigation";

import SequencesBrowser from "@/features/dwh-monitoring/components/sequences-browser";
import { DWH_SEGMENT, isAvailableModule } from "@/shared/config/areas.config";

export default async function DatawarehouseSequencesPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  if (!isAvailableModule(area, DWH_SEGMENT)) notFound();

  return <SequencesBrowser area={area} />;
}
