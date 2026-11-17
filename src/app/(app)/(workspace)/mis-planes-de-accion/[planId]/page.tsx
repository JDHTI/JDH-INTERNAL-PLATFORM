import PlanDetailScreen from "@/features/action-plans/components/plan-detail";

export default async function MyActionPlanPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;

  return <PlanDetailScreen planId={planId} backHref="/mis-planes-de-accion" backLabel="Volver a mis planes de acción" />;
}
