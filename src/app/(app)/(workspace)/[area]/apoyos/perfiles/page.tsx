import ManagerGate from "@/features/supports/components/manager-gate";
import ProfilesBrowser from "@/features/supports/components/profiles-browser";
import PageHeader from "@/shared/components/page-header";
import { requireModule } from "@/features/areas/server/area-access";

export default async function PerfilesPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  await requireModule(area, "apoyos");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Perfiles de proveedor"
        description="Lo que distingue a cada proveedor: los valores con que empiezan sus apoyos y cómo nombra las columnas de su archivo."
      />
      <ManagerGate action="editar perfiles de proveedor">
        <ProfilesBrowser area={area} />
      </ManagerGate>
    </div>
  );
}
