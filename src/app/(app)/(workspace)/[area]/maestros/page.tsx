import { redirect } from "next/navigation";

/**
 * Maestros has no landing (decided 2026-11-23): its sidebar row only opens the list of the
 * area's masters, each with its own page. An old link or bookmark lands on the area instead.
 */
export default async function MaestrosPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  redirect(`/${area}`);
}
