import { requireModule } from "@/features/areas/server/area-access";
import { INCREASE_VIEW_DESCRIPTIONS } from "@/features/commercial-masters/config/products-views";
import CostsScreen from "@/features/costs/components/costs-screen";
import PageHeader from "@/shared/components/page-header";

const SEGMENT = "acumulado-alzas";

/**
 * The supplier increase history and its analysis, the same views BI keeps
 * under Maestros > Productos, here under their own key so any area can have them.
 */
export default async function AcumuladoAlzasPage({
  params,
  searchParams,
}: {
  params: Promise<{ area: string }>;
  searchParams: Promise<{ vista?: string }>;
}) {
  const { area } = await params;
  await requireModule(area, SEGMENT);
  const vista = (await searchParams).vista;
  const current = vista === "analisis" || vista === "lotes" ? vista : "historico";
  const path = `/${area}/${SEGMENT}`;

  return (
    <div className="space-y-6">
      <PageHeader
        views={[
          {
            key: "historico",
            label: "Acumulado de alzas",
            href: path,
            description: INCREASE_VIEW_DESCRIPTIONS.history,
          },
          {
            key: "analisis",
            label: "Análisis de alzas",
            href: `${path}?vista=analisis`,
            description: INCREASE_VIEW_DESCRIPTIONS.analysis,
          },
          {
            key: "lotes",
            label: "Lotes de cargue",
            href: `${path}?vista=lotes`,
            description: INCREASE_VIEW_DESCRIPTIONS.loads,
          },
        ]}
        current={current}
        viewsLabel="Vistas del acumulado de alzas"
      />
      <CostsScreen view={{ kind: current === "analisis" ? "ledger-analysis" : current === "lotes" ? "ledger-loads" : "ledger" }} />
    </div>
  );
}
