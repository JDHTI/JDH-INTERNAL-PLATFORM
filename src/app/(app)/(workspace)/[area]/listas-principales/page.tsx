import QuotationsBrowser from "@/features/quotations/components/quotations-browser";
import QuotationsGate, { QuotationRulesLink } from "@/features/quotations/components/quotations-gate";
import { QuotationKindProvider } from "@/features/quotations/lib/kind";
import { listModuleViews } from "@/features/quotations/lib/list-views";
import PageHeader from "@/shared/components/page-header";
import { requireModule } from "@/features/areas/server/area-access";

const SEGMENT = "listas-principales";

/** The main lists (general, wholesale and Market), locked to BI: same engine as Actualización de listas. */
export default async function ListasPrincipalesPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  await requireModule(area, SEGMENT);
  const basePath = `/${area}/${SEGMENT}`;

  return (
    <QuotationKindProvider kind="principal">
      <div className="space-y-6">
        <PageHeader
          views={listModuleViews("principal", basePath)}
          current="actualizaciones"
          viewsLabel="Vistas de Listas principales"
          aside={<QuotationRulesLink basePath={basePath} label="Reglas de precios" />}
        />
        <QuotationsGate basePath={basePath}>
          <QuotationsBrowser basePath={basePath} />
        </QuotationsGate>
      </div>
    </QuotationKindProvider>
  );
}
