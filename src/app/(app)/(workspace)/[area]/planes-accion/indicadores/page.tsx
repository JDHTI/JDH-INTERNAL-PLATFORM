import { requireModule } from "@/features/areas/server/area-access";
import PlanIndicators from "@/features/action-plans/components/plan-indicators";
import { ACTION_PLANS_SEGMENT } from "@/shared/config/areas.config";

export default async function ActionPlanIndicatorsPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  await requireModule(area, ACTION_PLANS_SEGMENT);

  return <PlanIndicators area={area} />;
}
