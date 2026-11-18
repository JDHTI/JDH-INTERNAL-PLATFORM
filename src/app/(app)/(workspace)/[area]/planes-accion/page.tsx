import { requireModule } from "@/features/areas/server/area-access";
import PlansMatrix from "@/features/action-plans/components/plans-matrix";
import { ACTION_PLANS_SEGMENT } from "@/shared/config/areas.config";

export default async function ActionPlansPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  await requireModule(area, ACTION_PLANS_SEGMENT);

  return <PlansMatrix area={area} />;
}
