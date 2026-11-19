import { notFound } from "next/navigation";

import QuotationEditor from "@/features/quotations/components/quotation-editor";
import QuotationsGate from "@/features/quotations/components/quotations-gate";
import { QuotationKindProvider } from "@/features/quotations/lib/kind";
import { requireModule } from "@/features/areas/server/area-access";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A customer quotation opened from «Cotizaciones por validar»: the editor with its validation panel. */
export default async function CotizacionPorValidarPage({
  params,
}: {
  params: Promise<{ area: string; quotationId: string }>;
}) {
  const { area, quotationId } = await params;
  await requireModule(area, "actualizacion-listas");
  if (!UUID.test(quotationId)) notFound();
  const basePath = `/${area}/actualizacion-listas/cotizaciones`;

  return (
    <QuotationKindProvider kind="cotizacion">
      <QuotationsGate basePath={`/${area}/actualizacion-listas`}>
        <QuotationEditor quotationId={quotationId} basePath={basePath} rulesBasePath={`/${area}/actualizacion-listas`} />
      </QuotationsGate>
    </QuotationKindProvider>
  );
}
