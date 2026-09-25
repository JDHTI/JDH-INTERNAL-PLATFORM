import { notFound, redirect } from "next/navigation";

import { isAvailableModule } from "@/shared/config/areas.config";

export default async function PqrsfPage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  if (!isAvailableModule(area, "pqrsf")) notFound();

  redirect("/pqrsf");
}
