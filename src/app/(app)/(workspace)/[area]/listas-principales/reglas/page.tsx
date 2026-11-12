import QuotationRulesView from "@/features/quotations/components/rules-view";
import { QuotationKindProvider } from "@/features/quotations/lib/kind";
import { requireModule } from "@/features/areas/server/area-access";

/** The quoter's rules: the main lists price with the same engine. */
export default async function ReglasListasPrincipalesPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  await requireModule(area, "listas-principales");

  return (
    <QuotationKindProvider kind="principal">
      <QuotationRulesView basePath={`/${area}/listas-principales`} />
    </QuotationKindProvider>
  );
}
