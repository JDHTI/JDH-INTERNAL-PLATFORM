import { requireModule } from "@/features/areas/server/area-access";
import CostSettingsScreen from "@/features/cost-settings/components/cost-settings-screen";
import PageHeader from "@/shared/components/page-header";
import { COST_SETTINGS_SEGMENT } from "@/shared/config/areas.config";

export default async function AjusteCostosPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  await requireModule(area, COST_SETTINGS_SEGMENT);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ajuste de costos"
        description="Las reglas con las que el cotizador calcula el costo: los factores y márgenes, y de qué sucursal del proveedor se toma la cotización en cada C.O."
      />
      <CostSettingsScreen />
    </div>
  );
}
