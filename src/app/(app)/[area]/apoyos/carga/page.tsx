import { notFound } from "next/navigation";

import BulkLoad from "@/features/supports/components/bulk-load";
import ManagerGate from "@/features/supports/components/manager-gate";
import PageHeader from "@/shared/components/page-header";
import { isAvailableModule } from "@/shared/config/areas.config";

export default async function CargaApoyosPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  if (!isAvailableModule(area, "apoyos")) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Carga masiva de apoyos"
        description="Sube el archivo del proveedor, revisa la simulación y guarda. Si una sola fila tiene un error, no se guarda ninguna."
      />
      <ManagerGate action="cargar apoyos">
        <BulkLoad area={area} />
      </ManagerGate>
    </div>
  );
}
