import { requireModule } from "@/features/areas/server/area-access";
import CostsScreen from "@/features/costs/components/costs-screen";
import PageHeader from "@/shared/components/page-header";

export default async function AlzasProveedorPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  await requireModule(area, "alzas-proveedor");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alzas de proveedor"
        description="Las alzas que informa cada proveedor en su MAESTRA o que se digitan a mano. Al aprobarlas pasan al acumulado de alzas."
      />
      <CostsScreen view={{ kind: "requests", basePath: `/${area}/alzas-proveedor` }} />
    </div>
  );
}
