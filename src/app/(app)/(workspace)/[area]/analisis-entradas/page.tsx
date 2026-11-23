import { requireModule } from "@/features/areas/server/area-access";
import CostsScreen from "@/features/costs/components/costs-screen";
import PageHeader from "@/shared/components/page-header";

export default async function AnalisisEntradasPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  await requireModule(area, "analisis-entradas");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Análisis de entradas"
        description="Cada entrada de compra contra la cotización del proveedor vigente el día en que entró, con su motivo."
      />
      <CostsScreen view="entries" />
    </div>
  );
}
