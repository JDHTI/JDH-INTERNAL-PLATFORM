import ManagerGate from "@/features/supports/components/manager-gate";
import ProfileEditor from "@/features/supports/components/profile-editor";
import PageHeader from "@/shared/components/page-header";
import { requireModule } from "@/features/areas/server/area-access";

export default async function PerfilProveedorPage({
  params,
}: {
  params: Promise<{ area: string; proveedor: string }>;
}) {
  const { area, proveedor } = await params;
  await requireModule(area, "apoyos");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Perfil de apoyos"
        description="Valores por defecto y columnas del archivo de este proveedor. Los apoyos ya creados no cambian al editarlo."
      />
      <ManagerGate action="editar perfiles de proveedor">
        <ProfileEditor area={area} code={decodeURIComponent(proveedor)} />
      </ManagerGate>
    </div>
  );
}
