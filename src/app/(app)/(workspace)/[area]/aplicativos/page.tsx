import ApplicationsManager from "@/features/app-monitoring/components/applications-manager";
import { requireModule } from "@/features/areas/server/area-access";
import { APPS_SEGMENT } from "@/shared/config/areas.config";

export default async function ApplicationsPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  await requireModule(area, APPS_SEGMENT);

  return <ApplicationsManager area={area} />;
}
