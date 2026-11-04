import { notFound } from "next/navigation";

import ApplicationsManager from "@/features/app-monitoring/components/applications-manager";
import { APPS_SEGMENT, isAvailableModule } from "@/shared/config/areas.config";

export default async function ApplicationsPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  if (!isAvailableModule(area, APPS_SEGMENT)) notFound();

  return <ApplicationsManager area={area} />;
}
