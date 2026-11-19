import ListUpdatesToLoad from "@/features/quotations/components/list-updates-to-load";
import QuotationsGate, { QuotationRulesLink } from "@/features/quotations/components/quotations-gate";
import StagingView from "@/features/quotations/components/staging-view";
import { QuotationKindProvider } from "@/features/quotations/lib/kind";
import { listModuleViews } from "@/features/quotations/lib/list-views";
import PageHeader from "@/shared/components/page-header";
import { requireModule } from "@/features/areas/server/area-access";

const SEGMENT = "actualizacion-listas";

/**
 * The list updates validated and not loaded in SIESA yet, each with its files; under them, what
 * was validated item by item before updates went to validation whole, only while some is left.
 */
export default async function PorCargarPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  await requireModule(area, SEGMENT);
  const basePath = `/${area}/${SEGMENT}`;

  return (
    <QuotationKindProvider kind="lista">
      <div className="space-y-6">
        <PageHeader
          views={listModuleViews("lista", basePath)}
          current="por-cargar"
          viewsLabel="Vistas de Actualización de listas"
          aside={<QuotationRulesLink basePath={basePath} label="Reglas de precios" />}
        />
        <QuotationsGate basePath={basePath}>
          <div className="space-y-8">
            <ListUpdatesToLoad basePath={basePath} />
            <StagingView kind="lista" basePath={basePath} legacy />
          </div>
        </QuotationsGate>
      </div>
    </QuotationKindProvider>
  );
}
