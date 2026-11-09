import { notFound } from "next/navigation";

import OfferPreview from "@/features/quotations/components/offer-preview";
import QuotationsGate from "@/features/quotations/components/quotations-gate";
import { requireModule } from "@/features/areas/server/area-access";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The customer's offer: preview, workbook and PDF. `?imprimir=1` opens the print dialog on arrival. */
export default async function OfertaPage({
  params,
  searchParams,
}: {
  params: Promise<{ area: string; quotationId: string }>;
  searchParams: Promise<{ imprimir?: string }>;
}) {
  const { area, quotationId } = await params;
  const { imprimir } = await searchParams;
  await requireModule(area, "cotizador");
  if (!UUID.test(quotationId)) notFound();
  const basePath = `/${area}/cotizador`;

  return (
    <QuotationsGate basePath={basePath}>
      <OfferPreview quotationId={quotationId} basePath={basePath} autoPrint={imprimir === "1"} />
    </QuotationsGate>
  );
}
