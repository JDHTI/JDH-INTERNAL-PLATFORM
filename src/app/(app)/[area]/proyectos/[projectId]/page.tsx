import ProjectPage from "@/features/projects/components/project-page";

export default async function ProyectoPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectPage projectId={projectId} />;
}
