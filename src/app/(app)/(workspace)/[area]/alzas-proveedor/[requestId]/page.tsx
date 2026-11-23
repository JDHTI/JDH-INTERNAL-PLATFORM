import { requireModule } from "@/features/areas/server/area-access";
import CostsScreen from "@/features/costs/components/costs-screen";
import PageHeader from "@/shared/components/page-header";

export default async function SolicitudAlzaPage({ params }: { params: Promise<{ area: string; requestId: string }> }) {
  const { area, requestId } = await params;
  await requireModule(area, "alzas-proveedor");

  return (
    <div className="space-y-6">
      <PageHeader title="Solicitud de alza" description="Revisa cada referencia, corrige o deja por fuera las que no van, y decide." />
      <CostsScreen view={{ kind: "request", basePath: `/${area}/alzas-proveedor`, requestId }} />
    </div>
  );
}
