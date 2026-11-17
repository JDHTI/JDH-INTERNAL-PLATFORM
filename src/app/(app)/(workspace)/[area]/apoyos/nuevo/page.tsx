import { redirect } from "next/navigation";

import { requireModule } from "@/features/areas/server/area-access";

/** A new support is created in a modal over the master; this address opens it there. */
export default async function NuevoApoyoPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  await requireModule(area, "apoyos");
  redirect(`/${area}/apoyos?nuevo=1`);
}
