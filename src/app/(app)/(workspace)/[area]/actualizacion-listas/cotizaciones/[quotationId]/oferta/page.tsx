import { notFound } from "next/navigation";

import OfferPreview from "@/features/quotations/components/offer-preview";
import QuotationsGate from "@/features/quotations/components/quotations-gate";
import { QuotationKindProvider } from "@/features/quotations/lib/kind";
import { requireModule } from "@/features/areas/server/area-access";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The customer's offer of a quotation opened from «Cotizaciones por validar». */
export default async function OfertaPorValidarPage({
  params,
  searchParams,
}: {
  params: Promise<{ area: string; quotationId: string }>;
  searchParams: Promise<{ imprimir?: string }>;
}) {
  const { area, quotationId } = await params;
  const { imprimir } = await searchParams;
  await requireModule(area, "actualizacion-listas");
  if (!UUID.test(quotationId)) notFound();
  const basePath = `/${area}/actualizacion-listas/cotizaciones`;

  return (
    <QuotationKindProvider kind="cotizacion">
      <QuotationsGate basePath={`/${area}/actualizacion-listas`}>
        <OfferPreview quotationId={quotationId} basePath={basePath} autoPrint={imprimir === "1"} />
      </QuotationsGate>
    </QuotationKindProvider>
  );
}
