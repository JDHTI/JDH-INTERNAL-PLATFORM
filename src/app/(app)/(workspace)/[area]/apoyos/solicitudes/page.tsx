import { redirect } from "next/navigation";

import { SUPPORT_REQUESTS_SEGMENT } from "@/shared/config/areas.config";

/** Comercial's requests lived here before every area got the module at one path; old links still land. */
export default async function Page({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  redirect(`/${area}/${SUPPORT_REQUESTS_SEGMENT}`);
}
