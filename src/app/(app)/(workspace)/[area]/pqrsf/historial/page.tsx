import ActivityHistory from "@/features/pqrsf/components/activity-history";
import { requireModule } from "@/features/areas/server/area-access";

export default async function PqrsfHistoryPage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  await requireModule(area, "pqrsf");

  return <ActivityHistory area={area} />;
}
