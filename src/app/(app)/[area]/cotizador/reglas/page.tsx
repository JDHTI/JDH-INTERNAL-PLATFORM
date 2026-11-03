import { notFound } from "next/navigation";

import QuotationRulesView from "@/features/quotations/components/rules-view";
import { isAvailableModule } from "@/shared/config/areas.config";

/** Open to everyone: no permission gate, like the validator's rules. */
export default async function ReglasCotizadorPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  if (!isAvailableModule(area, "cotizador")) notFound();

  return <QuotationRulesView basePath={`/${area}/cotizador`} />;
}
