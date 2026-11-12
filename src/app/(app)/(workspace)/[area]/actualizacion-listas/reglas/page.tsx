import QuotationRulesView from "@/features/quotations/components/rules-view";
import { QuotationKindProvider } from "@/features/quotations/lib/kind";
import { requireModule } from "@/features/areas/server/area-access";

/** The quoter's rules: the list updates price with the same engine. Open to everyone. */
export default async function ReglasActualizacionListasPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  await requireModule(area, "actualizacion-listas");

  return (
    <QuotationKindProvider kind="lista">
      <QuotationRulesView basePath={`/${area}/actualizacion-listas`} />
    </QuotationKindProvider>
  );
}
