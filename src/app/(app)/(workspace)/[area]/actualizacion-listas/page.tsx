import QuotationsBrowser from "@/features/quotations/components/quotations-browser";
import QuotationsGate, { QuotationRulesLink } from "@/features/quotations/components/quotations-gate";
import { QuotationKindProvider } from "@/features/quotations/lib/kind";
import PageHeader from "@/shared/components/page-header";
import { requireModule } from "@/features/areas/server/area-access";

const SEGMENT = "actualizacion-listas";

/** The quoter's engine over an existing SIESA list: same states and files, no customer offer. */
export default async function ActualizacionListasPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  await requireModule(area, SEGMENT);
  const basePath = `/${area}/${SEGMENT}`;

  return (
    <QuotationKindProvider kind="lista">
      <div className="space-y-6">
        <PageHeader
          title="Actualización de listas"
          description="Una lista de precios vigente de SIESA contra el costo de hoy, el margen objetivo, la última venta y los apoyos de sus clientes, y el formato para actualizarla."
          aside={<QuotationRulesLink basePath={basePath} label="Reglas de precios" />}
        />
        <QuotationsGate basePath={basePath}>
          <QuotationsBrowser basePath={basePath} />
        </QuotationsGate>
      </div>
    </QuotationKindProvider>
  );
}
