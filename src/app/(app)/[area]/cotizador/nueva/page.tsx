import { notFound } from "next/navigation";

import NewQuotationForm from "@/features/quotations/components/new-quotation-form";
import QuotationsGate from "@/features/quotations/components/quotations-gate";
import { isAvailableModule } from "@/shared/config/areas.config";

/** A static segment: Next resolves it before the `[quotationId]` next to it. */
export default async function NuevaCotizacionPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  if (!isAvailableModule(area, "cotizador")) notFound();
  const basePath = `/${area}/cotizador`;

  return (
    <QuotationsGate basePath={basePath}>
      <NewQuotationForm basePath={basePath} />
    </QuotationsGate>
  );
}
