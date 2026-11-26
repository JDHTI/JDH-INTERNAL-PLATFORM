import { requireModule } from "@/features/areas/server/area-access";
import ServiceLevelScreen from "@/features/service-level/components/service-level-screen";
import PageHeader from "@/shared/components/page-header";

export default async function PendientesPedidosPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  await requireModule(area, "pendientes-pedidos");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pendientes de pedidos"
        description="Las líneas de los pedidos cumplidos que dejaron algo sin despachar, con su motivo y su responsable."
      />
      <ServiceLevelScreen view="pending" />
    </div>
  );
}
