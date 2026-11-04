import { notFound } from "next/navigation";

import ApplicationDetail from "@/features/app-monitoring/components/application-detail";
import { APPS_SEGMENT, isAvailableModule } from "@/shared/config/areas.config";

export default async function ApplicationPage({
  params,
}: {
  params: Promise<{ area: string; aplicativo: string }>;
}) {
  const { area, aplicativo } = await params;
  if (!isAvailableModule(area, APPS_SEGMENT)) notFound();

  return <ApplicationDetail area={area} id={decodeURIComponent(aplicativo)} />;
}
