import { notFound, redirect } from "next/navigation";

import QuotationEditor from "@/features/quotations/components/quotation-editor";
import QuotationsGate from "@/features/quotations/components/quotations-gate";
import { isAvailableModule } from "@/shared/config/areas.config";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function CotizacionPage({
  params,
}: {
  params: Promise<{ area: string; quotationId: string }>;
}) {
  const { area, quotationId } = await params;
  if (!isAvailableModule(area, "cotizador")) notFound();
  const basePath = `/${area}/cotizador`;
  // "Nueva cotización" was a page here before it became a modal on the list;
  // an old link or bookmark lands on the list instead of a broken editor.
  if (quotationId === "nueva") redirect(basePath);
  // Anything else that is not an id would only get the API's validation error.
  if (!UUID.test(quotationId)) notFound();

  return (
    <QuotationsGate basePath={basePath}>
      <QuotationEditor quotationId={quotationId} basePath={basePath} />
    </QuotationsGate>
  );
}
