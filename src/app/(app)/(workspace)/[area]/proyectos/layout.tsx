import { notFound } from "next/navigation";

import ProjectsShell from "@/features/projects/components/projects-shell";
import { isAvailableModule } from "@/shared/config/areas.config";

/**
 * Shared by the folder list and every project page. Layouts do not re-render
 * on navigation, so the area's live connection survives moving between them.
 */
export default async function ProyectosLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  if (!isAvailableModule(area, "proyectos")) notFound();

  return <ProjectsShell slug={area}>{children}</ProjectsShell>;
}
