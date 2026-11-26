import { requireModule } from "@/features/areas/server/area-access";
import BudgetScreen from "@/features/commercial-budget/components/budget-screen";
import PageHeader from "@/shared/components/page-header";
import { COMMERCIAL_BUDGET_SEGMENT } from "@/shared/config/areas.config";

export default async function PresupuestoComercialPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  await requireModule(area, COMMERCIAL_BUDGET_SEGMENT);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Presupuesto comercial"
        description="La venta, el margen y los clientes de cada vendedor en el mes, contra su presupuesto, el promedio de los tres meses anteriores y el mismo mes del año pasado."
      />
      <BudgetScreen />
    </div>
  );
}
