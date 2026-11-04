import { notFound } from "next/navigation";

import ActivityHistory from "@/features/pqrsf/components/activity-history";
import { isAvailableModule } from "@/shared/config/areas.config";

export default async function PqrsfHistoryPage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  if (!isAvailableModule(area, "pqrsf")) notFound();

  return <ActivityHistory area={area} />;
}
