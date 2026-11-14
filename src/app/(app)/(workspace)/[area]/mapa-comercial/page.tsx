import { requireModule } from "@/features/areas/server/area-access";
import CommercialMapWorkspace from "@/features/commercial-map/components/commercial-map-workspace";
import { parseMapView } from "@/features/commercial-map/lib/views";
import { COMMERCIAL_MAP_SEGMENT } from "@/shared/config/areas.config";

export default async function MapaComercialPage({
  params,
  searchParams,
}: {
  params: Promise<{ area: string }>;
  searchParams: Promise<{ vista?: string }>;
}) {
  const { area } = await params;
  await requireModule(area, COMMERCIAL_MAP_SEGMENT);
  const { vista } = await searchParams;

  return <CommercialMapWorkspace initialView={parseMapView(vista)} />;
}
