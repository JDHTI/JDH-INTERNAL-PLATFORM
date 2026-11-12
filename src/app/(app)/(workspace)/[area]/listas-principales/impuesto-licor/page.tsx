import LiquorTaxesView from "@/features/quotations/components/liquor-taxes-view";
import QuotationsGate from "@/features/quotations/components/quotations-gate";
import { QuotationKindProvider } from "@/features/quotations/lib/kind";
import { listModuleViews } from "@/features/quotations/lib/list-views";
import PageHeader from "@/shared/components/page-header";
import { requireModule } from "@/features/areas/server/area-access";

const SEGMENT = "listas-principales";

/** The liquor tax of every active liquor across every list, and its bulk changes. */
export default async function ImpuestoLicorPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  await requireModule(area, SEGMENT);
  const basePath = `/${area}/${SEGMENT}`;

  return (
    <QuotationKindProvider kind="principal">
      <div className="space-y-6">
        <PageHeader views={listModuleViews("principal", basePath)} current="impuesto-licor" viewsLabel="Vistas de Listas principales" />
        <QuotationsGate basePath={basePath}>
          <LiquorTaxesView />
        </QuotationsGate>
      </div>
    </QuotationKindProvider>
  );
}
