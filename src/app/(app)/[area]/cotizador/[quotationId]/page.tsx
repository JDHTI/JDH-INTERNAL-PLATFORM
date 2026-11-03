import { notFound } from "next/navigation";

import QuotationEditor from "@/features/quotations/components/quotation-editor";
import QuotationsGate from "@/features/quotations/components/quotations-gate";
import { isAvailableModule } from "@/shared/config/areas.config";

export default async function CotizacionPage({
  params,
}: {
  params: Promise<{ area: string; quotationId: string }>;
}) {
  const { area, quotationId } = await params;
  if (!isAvailableModule(area, "cotizador")) notFound();
  const basePath = `/${area}/cotizador`;

  return (
    <QuotationsGate basePath={basePath}>
      <QuotationEditor quotationId={quotationId} basePath={basePath} />
    </QuotationsGate>
  );
}
