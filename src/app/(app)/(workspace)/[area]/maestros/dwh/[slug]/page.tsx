import { requireModule } from "@/features/areas/server/area-access";
import { MASTERS_SEGMENT } from "@/features/commercial-masters/config/masters.config";
import { AreaMasterView } from "@/features/masters/components/masters-browser";

/** One DWH master of the area, opened from the sidebar's Maestros list; its panel carries the title. */
export default async function AreaMasterPage({ params }: { params: Promise<{ area: string; slug: string }> }) {
  const { area, slug } = await params;
  await requireModule(area, MASTERS_SEGMENT);
  return <AreaMasterView key={slug} area={area} slug={decodeURIComponent(slug)} />;
}
