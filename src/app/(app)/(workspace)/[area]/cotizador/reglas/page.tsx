import QuotationRulesView from "@/features/quotations/components/rules-view";
import { requireModule } from "@/features/areas/server/area-access";

/** Open to everyone: no permission gate, like the validator's rules. */
export default async function ReglasCotizadorPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  await requireModule(area, "cotizador");

  return <QuotationRulesView basePath={`/${area}/cotizador`} />;
}
