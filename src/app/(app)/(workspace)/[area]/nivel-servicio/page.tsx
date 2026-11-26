import { requireModule } from "@/features/areas/server/area-access";
import ServiceLevelScreen from "@/features/service-level/components/service-level-screen";
import PageHeader from "@/shared/components/page-header";

export default async function NivelServicioPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  await requireModule(area, "nivel-servicio");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nivel de servicio"
        description="Cuánto de lo pedido se despachó, por pedido, línea, cantidad y valor, con sus desgloses y la clasificación ABCD."
      />
      <ServiceLevelScreen view="dashboard" />
    </div>
  );
}
