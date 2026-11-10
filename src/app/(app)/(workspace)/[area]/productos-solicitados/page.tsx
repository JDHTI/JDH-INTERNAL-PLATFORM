import PageHeader from "@/shared/components/page-header";
import RequestedProductsView from "@/features/requested-products/components/requested-products-view";
import { requireModule } from "@/features/areas/server/area-access";

/** Its own module: products quoted that SIESA does not have yet; Comercial follows them, BI resolves them. */
export default async function ProductosSolicitadosPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  await requireModule(area, "productos-solicitados");

  return (
    <div className="space-y-4">
      <PageHeader
        title="Productos solicitados"
        description="Lo que se cotizó sin existir en SIESA, para crearlo, volver a cotizarlo o comprarlo. Queda aquí aunque se borre la cotización."
      />
      <RequestedProductsView />
    </div>
  );
}
