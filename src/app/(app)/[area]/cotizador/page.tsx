import { notFound } from "next/navigation";

import QuotationsBrowser from "@/features/quotations/components/quotations-browser";
import QuotationsGate, { QuotationRulesLink } from "@/features/quotations/components/quotations-gate";
import PageHeader from "@/shared/components/page-header";
import { isAvailableModule } from "@/shared/config/areas.config";

const SEGMENT = "cotizador";

export default async function CotizadorPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  if (!isAvailableModule(area, SEGMENT)) notFound();
  const basePath = `/${area}/${SEGMENT}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cotizador"
        description="La lista de precios que cada cliente viene pagando, contra el costo de hoy, el margen objetivo y los apoyos vigentes, y el formato para actualizarla en SIESA."
        aside={<QuotationRulesLink basePath={basePath} />}
      />
      <QuotationsGate basePath={basePath}>
        <QuotationsBrowser basePath={basePath} />
      </QuotationsGate>
    </div>
  );
}
