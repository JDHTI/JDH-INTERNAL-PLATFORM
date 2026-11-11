import { notFound } from "next/navigation";

import { requireModule } from "@/features/areas/server/area-access";
import CommercialMasterTable from "@/features/commercial-masters/components/commercial-master-table";
import PriceIncreaseAnalysisView from "@/features/commercial-masters/components/price-increase-analysis-view";
import PriceIncreasesView from "@/features/commercial-masters/components/price-increases-view";
import ProductsViewsNav, { VIEW_DESCRIPTIONS, productsView } from "@/features/commercial-masters/components/products-views-nav";
import { MASTERS_SEGMENT, findCommercialMaster } from "@/features/commercial-masters/config/masters.config";
import { COMMERCIAL_MASTERS_AREA_SLUG } from "@/shared/config/areas.config";

export default async function MaestroPage({
  params,
  searchParams,
}: {
  params: Promise<{ area: string; master: string }>;
  searchParams: Promise<{ vista?: string }>;
}) {
  const { area, master: key } = await params;
  const master = findCommercialMaster(key);
  if (!master || area !== COMMERCIAL_MASTERS_AREA_SLUG) notFound();
  await requireModule(area, MASTERS_SEGMENT);

  if (master.key === "productos") {
    // The module grants every view: the master, the increase history and its analysis.
    const view = productsView((await searchParams).vista);
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <ProductsViewsNav path={`/${area}/${MASTERS_SEGMENT}/${master.key}`} view={view} />
          <p className="text-sm text-text-secondary">{view === "maestro" ? master.description : VIEW_DESCRIPTIONS[view]}</p>
        </div>
        {view === "alzas" ? (
          <PriceIncreasesView />
        ) : view === "analisis" ? (
          <PriceIncreaseAnalysisView />
        ) : (
          <CommercialMasterTable key={master.key} masterKey={master.key} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{master.name}</h1>
        <p className="text-sm text-text-secondary">{master.description}</p>
      </div>
      {/* Keyed so paging and search start over when the dropdown changes master. */}
      <CommercialMasterTable key={master.key} masterKey={master.key} />
    </div>
  );
}
