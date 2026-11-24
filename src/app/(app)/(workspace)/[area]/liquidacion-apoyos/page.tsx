import { requireModule } from "@/features/areas/server/area-access";
import SettlementsScreen from "@/features/support-settlements/components/settlements-screen";
import PageHeader from "@/shared/components/page-header";
import { SUPPORT_SETTLEMENTS_SEGMENT } from "@/shared/config/areas.config";

export default async function LiquidacionApoyosPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  await requireModule(area, SUPPORT_SETTLEMENTS_SEGMENT);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Liquidación de apoyos"
        description="Lo que debe reconocer cada proveedor por las ventas apoyadas del mes, con el margen recompuesto. Se liquida el mes completo ya vencido; el mes en curso es una vista previa."
      />
      <SettlementsScreen />
    </div>
  );
}
