import { notFound, redirect } from "next/navigation";

import AreaGate from "@/features/areas/components/area-gate";
import { backendFetch } from "@/intranet/lib/api/backend-fetch";
import { ACCESS_DENIED_PARAM, WORKSPACE_PATH } from "@/shared/config/general.config";

/**
 * Every area lives behind this one segment, so an area added in the database
 * gets its overview and its document manager without touching the UI.
 *
 * The API decides who enters: it is asked here, on the server, before any
 * part of the area reaches the browser. No session goes to /login, no access
 * goes back to the hub, no such area is a 404. When the API itself fails the
 * gate below shows the error and offers a retry instead of a blank page.
 */
export default async function AreaLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  const response = await backendFetch(`/areas/${encodeURIComponent(area)}`).catch(() => null);
  if (response?.status === 401) redirect("/login");
  if (response?.status === 403) redirect(`${WORKSPACE_PATH}?${ACCESS_DENIED_PARAM}=area`);
  if (response?.status === 404) notFound();

  return <AreaGate slug={area}>{children}</AreaGate>;
}
