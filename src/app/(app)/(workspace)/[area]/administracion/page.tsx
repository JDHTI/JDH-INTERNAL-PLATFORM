import { redirect } from "next/navigation";

import { ADMIN_PATH } from "@/shared/config/areas.config";

/** The module has no landing screen: its first section is the way in. */
export default function AdministrationPage() {
  redirect(`${ADMIN_PATH}/areas`);
}
