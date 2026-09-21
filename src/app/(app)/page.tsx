import { redirect } from "next/navigation";

import { DEFAULT_AREA } from "@/shared/config/areas.config";

/**
 * Every screen belongs to an area, so the root has no content of its own and
 * hands off to the default one. Once Entra is wired this should send the user
 * to their own primary area instead of a constant.
 */
export default function RootPage() {
  redirect(DEFAULT_AREA.path);
}
