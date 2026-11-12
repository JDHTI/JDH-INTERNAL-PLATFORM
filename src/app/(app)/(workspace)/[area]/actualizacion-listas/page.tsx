import QuotationsBrowser from "@/features/quotations/components/quotations-browser";
import QuotationsGate, { QuotationRulesLink } from "@/features/quotations/components/quotations-gate";
import { QuotationKindProvider } from "@/features/quotations/lib/kind";
import { listModuleViews } from "@/features/quotations/lib/list-views";
import PageHeader from "@/shared/components/page-header";
import { requireModule } from "@/features/areas/server/area-access";

const SEGMENT = "actualizacion-listas";

/** The quoter's engine over an existing SIESA list, reviewed item by item; the main lists go through Listas principales. */
export default async function ActualizacionListasPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  await requireModule(area, SEGMENT);
  const basePath = `/${area}/${SEGMENT}`;

  return (
    <QuotationKindProvider kind="lista">
      <div className="space-y-6">
        <PageHeader
          views={listModuleViews("lista", basePath)}
          current="actualizaciones"
          viewsLabel="Vistas de Actualización de listas"
          aside={<QuotationRulesLink basePath={basePath} label="Reglas de precios" />}
        />
        <QuotationsGate basePath={basePath}>
          <QuotationsBrowser basePath={basePath} />
        </QuotationsGate>
      </div>
    </QuotationKindProvider>
  );
}
