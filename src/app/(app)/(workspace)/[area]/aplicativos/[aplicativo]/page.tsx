import ApplicationDetail from "@/features/app-monitoring/components/application-detail";
import { requireModule } from "@/features/areas/server/area-access";
import { APPS_SEGMENT } from "@/shared/config/areas.config";

export default async function ApplicationPage({
  params,
}: {
  params: Promise<{ area: string; aplicativo: string }>;
}) {
  const { area, aplicativo } = await params;
  await requireModule(area, APPS_SEGMENT);

  return <ApplicationDetail area={area} id={decodeURIComponent(aplicativo)} />;
}
