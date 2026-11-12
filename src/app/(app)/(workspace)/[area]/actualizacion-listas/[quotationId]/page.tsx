import { notFound } from "next/navigation";

import QuotationEditor from "@/features/quotations/components/quotation-editor";
import QuotationsGate from "@/features/quotations/components/quotations-gate";
import { QuotationKindProvider } from "@/features/quotations/lib/kind";
import { requireModule } from "@/features/areas/server/area-access";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ActualizacionListaPage({
  params,
}: {
  params: Promise<{ area: string; quotationId: string }>;
}) {
  const { area, quotationId } = await params;
  await requireModule(area, "actualizacion-listas");
  if (!UUID.test(quotationId)) notFound();
  const basePath = `/${area}/actualizacion-listas`;

  return (
    <QuotationKindProvider kind="lista">
      <QuotationsGate basePath={basePath}>
        <QuotationEditor quotationId={quotationId} basePath={basePath} />
      </QuotationsGate>
    </QuotationKindProvider>
  );
}
