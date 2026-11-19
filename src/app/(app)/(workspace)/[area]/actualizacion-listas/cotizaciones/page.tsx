import QuotationsGate, { QuotationRulesLink } from "@/features/quotations/components/quotations-gate";
import QuotationsToValidate from "@/features/quotations/components/quotations-to-validate";
import { QuotationKindProvider } from "@/features/quotations/lib/kind";
import { listModuleViews } from "@/features/quotations/lib/list-views";
import PageHeader from "@/shared/components/page-header";
import { requireModule } from "@/features/areas/server/area-access";

const SEGMENT = "actualizacion-listas";

/** The customer quotations waiting for BI to validate or load their list. */
export default async function CotizacionesPorValidarPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  await requireModule(area, SEGMENT);
  const basePath = `/${area}/${SEGMENT}`;

  return (
    <div className="space-y-6">
      <PageHeader
        views={listModuleViews("lista", basePath)}
        current="cotizaciones"
        viewsLabel="Vistas de Actualización de listas"
        aside={<QuotationRulesLink basePath={basePath} label="Reglas de precios" />}
      />
      {/* Customer quotations: their own permissions (`kind=cotizacion`), where BI's list validators validate too. */}
      <QuotationKindProvider kind="cotizacion">
        <QuotationsGate basePath={basePath}>
          <QuotationsToValidate basePath={`${basePath}/cotizaciones`} />
        </QuotationsGate>
      </QuotationKindProvider>
    </div>
  );
}
