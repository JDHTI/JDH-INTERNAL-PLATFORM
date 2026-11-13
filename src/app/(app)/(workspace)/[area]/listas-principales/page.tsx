import { Suspense } from "react";

import MainListsBoard from "@/features/quotations/components/main-lists-board";
import QuotationsGate, { QuotationRulesLink } from "@/features/quotations/components/quotations-gate";
import { QuotationKindProvider } from "@/features/quotations/lib/kind";
import { listModuleViews } from "@/features/quotations/lib/list-views";
import PageHeader from "@/shared/components/page-header";
import { requireModule } from "@/features/areas/server/area-access";

const SEGMENT = "listas-principales";

/** Every main list (general, wholesale and Market) in one table, locked to BI. */
export default async function ListasPrincipalesPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  await requireModule(area, SEGMENT);
  const basePath = `/${area}/${SEGMENT}`;

  return (
    <QuotationKindProvider kind="principal">
      <div className="space-y-6">
        <PageHeader
          views={listModuleViews("principal", basePath)}
          current="actualizaciones"
          viewsLabel="Vistas de Listas principales"
          aside={<QuotationRulesLink basePath={basePath} label="Reglas de precios" />}
        />
        <QuotationsGate basePath={basePath}>
          {/* The board reads its first filter (?lista=…&q=…) from the address. */}
          <Suspense>
            <MainListsBoard />
          </Suspense>
        </QuotationsGate>
      </div>
    </QuotationKindProvider>
  );
}
