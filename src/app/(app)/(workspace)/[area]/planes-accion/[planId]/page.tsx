import { requireModule } from "@/features/areas/server/area-access";
import PlanDetailScreen from "@/features/action-plans/components/plan-detail";
import { ACTION_PLANS_SEGMENT } from "@/shared/config/areas.config";

export default async function ActionPlanPage({ params }: { params: Promise<{ area: string; planId: string }> }) {
  const { area, planId } = await params;
  await requireModule(area, ACTION_PLANS_SEGMENT);

  return (
    <PlanDetailScreen
      planId={planId}
      backHref={`/${area}/planes-accion`}
      backLabel="Volver a la matriz"
      caseArea={area}
    />
  );
}
