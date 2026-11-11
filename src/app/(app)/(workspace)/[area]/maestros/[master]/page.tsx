import { notFound } from "next/navigation";

import { requireModule } from "@/features/areas/server/area-access";
import CommercialMasterTable from "@/features/commercial-masters/components/commercial-master-table";
import PriceIncreasesView from "@/features/commercial-masters/components/price-increases-view";
import ProductsViewsNav, { INCREASES_VIEW } from "@/features/commercial-masters/components/products-views-nav";
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
    const increases = (await searchParams).vista === INCREASES_VIEW;
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <ProductsViewsNav path={`/${area}/${MASTERS_SEGMENT}/${master.key}`} increases={increases} />
          <p className="text-sm text-text-secondary">
            {increases ? "Alzas que notifican los proveedores y si ya están en SIESA." : master.description}
          </p>
        </div>
        {increases ? <PriceIncreasesView /> : <CommercialMasterTable key={master.key} masterKey={master.key} />}
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
