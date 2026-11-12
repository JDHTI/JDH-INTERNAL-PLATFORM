import BulkLoad from "@/features/supports/components/bulk-load";
import ManagerGate from "@/features/supports/components/manager-gate";
import PageHeader from "@/shared/components/page-header";
import { requireModule } from "@/features/areas/server/area-access";

export default async function CargaApoyosPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  await requireModule(area, "apoyos");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Carga masiva de apoyos"
        description="Sube el archivo del proveedor, revisa la simulación y aplícala: crea los apoyos nuevos y actualiza los que ya existen. Si una sola fila tiene un error, no se guarda ninguna."
      />
      <ManagerGate action="cargar apoyos">
        <BulkLoad area={area} />
      </ManagerGate>
    </div>
  );
}
