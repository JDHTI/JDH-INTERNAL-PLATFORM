import DocumentManager from "@/features/documents/components/document-manager";

export default async function DocumentosPage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  return <DocumentManager slug={area} />;
}
