import { requireModule } from "@/features/areas/server/area-access";
import VendorMasterScreen from "@/features/commercial-budget/components/vendor-master-screen";
import PageHeader from "@/shared/components/page-header";
import { VENDOR_MASTER_SEGMENT } from "@/shared/config/areas.config";

export default async function MaestroVendedoresPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  await requireModule(area, VENDOR_MASTER_SEGMENT);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maestro de vendedores"
        description="El equipo, la regional, la unidad de negocio y el coordinador de cada vendedor. La carga escribe en el DWH, y de ahí salen el presupuesto comercial y los reportes de ventas."
      />
      <VendorMasterScreen />
    </div>
  );
}
