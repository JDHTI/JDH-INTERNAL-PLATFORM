import AreaGate from "@/features/areas/components/area-gate";

/**
 * Every area lives behind this one segment, so an area added in the database
 * gets its overview and its document manager without touching the UI. The
 * gate resolves the slug against the API before any child renders.
 */
export default async function AreaLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  return <AreaGate slug={area}>{children}</AreaGate>;
}
