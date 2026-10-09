import { notFound, redirect } from "next/navigation";

import { COMMERCIAL_MASTERS } from "@/features/commercial-masters/config/masters.config";
import { isAvailableModule } from "@/shared/config/areas.config";

/** The module row has no screen of its own: it lands on the first master. */
export default async function MaestrosIndexPage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  if (!isAvailableModule(area, "maestros")) notFound();

  redirect(`/${area}/maestros/${COMMERCIAL_MASTERS[0].key}`);
}
