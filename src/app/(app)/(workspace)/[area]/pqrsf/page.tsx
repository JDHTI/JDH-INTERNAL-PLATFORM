import { Suspense } from "react";

import CaseInbox, { InboxSkeleton } from "@/features/pqrsf/components/case-inbox";
import { requireModule } from "@/features/areas/server/area-access";

export default async function PqrsfPage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  await requireModule(area, "pqrsf");

  // The inbox reads its filters from the URL, which only exists in the
  // browser request: the boundary keeps the build from prerendering it.
  return (
    <Suspense fallback={<InboxSkeleton />}>
      <CaseInbox area={area} />
    </Suspense>
  );
}
