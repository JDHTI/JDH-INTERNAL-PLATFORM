import { notFound } from "next/navigation";

import ProjectManager from "@/features/projects/components/project-manager";
import { isAvailableModule } from "@/shared/config/areas.config";

export default async function ProyectosPage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  if (!isAvailableModule(area, "proyectos")) notFound();

  return <ProjectManager slug={area} />;
}
