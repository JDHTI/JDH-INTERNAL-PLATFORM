import { requireModule } from "@/features/areas/server/area-access";
import { MASTERS_SEGMENT } from "@/features/commercial-masters/config/masters.config";
import MastersBrowser from "@/features/masters/components/masters-browser";
import PageHeader from "@/shared/components/page-header";

export default async function MaestrosPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  await requireModule(area, MASTERS_SEGMENT);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maestros"
        description="Los maestros del DWH que TI habilitó para esta área. Se actualizan solos cuando el DWH publica datos nuevos."
      />
      <MastersBrowser area={area} />
    </div>
  );
}
