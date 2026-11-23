import { requireModule } from "@/features/areas/server/area-access";
import CostsScreen from "@/features/costs/components/costs-screen";
import PageHeader from "@/shared/components/page-header";

export default async function NovedadesComprasPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  await requireModule(area, "novedades-compras");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Novedades y notas crédito"
        description="Las entradas que no cuadraron con su cotización: su motivo y, cuando el motivo la pide, la nota crédito del proveedor."
      />
      <CostsScreen view={{ kind: "novelties" }} />
    </div>
  );
}
