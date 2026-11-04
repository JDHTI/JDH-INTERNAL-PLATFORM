import AreaOverview from "@/shared/components/area-overview";

export default async function AreaPage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  return <AreaOverview slug={area} />;
}
