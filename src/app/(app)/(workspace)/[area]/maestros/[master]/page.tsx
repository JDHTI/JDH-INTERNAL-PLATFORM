import { notFound } from "next/navigation";

import { requireModule } from "@/features/areas/server/area-access";
import CommercialMasterTable from "@/features/commercial-masters/components/commercial-master-table";
import PriceIncreaseAnalysisView from "@/features/commercial-masters/components/price-increase-analysis-view";
import PriceIncreasesView from "@/features/commercial-masters/components/price-increases-view";
import { MASTERS_SEGMENT, findCommercialMaster } from "@/features/commercial-masters/config/masters.config";
import { productsView, productsViews } from "@/features/commercial-masters/config/products-views";
import PageHeader from "@/shared/components/page-header";

export default async function MaestroPage({
  params,
  searchParams,
}: {
  params: Promise<{ area: string; master: string }>;
  searchParams: Promise<{ vista?: string }>;
}) {
  const { area, master: key } = await params;
  const master = findCommercialMaster(key);
  // The same four tables in every area that has the Maestros module (decided 2026-11-23).
  if (!master) notFound();
  await requireModule(area, MASTERS_SEGMENT);

  if (master.key === "productos") {
    // The module grants every view: the master, the increase history and its analysis.
    const view = productsView((await searchParams).vista);
    return (
      <div className="space-y-6">
        <PageHeader
          views={productsViews(`/${area}/${MASTERS_SEGMENT}/${master.key}`, master.description)}
          current={view}
          viewsLabel="Vistas de productos"
        />
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
      <PageHeader title={master.name} description={master.description} />
      {/* Keyed so paging and search start over when the dropdown changes master. */}
      <CommercialMasterTable key={master.key} masterKey={master.key} />
    </div>
  );
}
