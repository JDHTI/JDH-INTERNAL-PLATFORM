import type { Metadata } from "next";
import { Suspense } from "react";

import WorkspaceGuide from "@/features/areas/components/workspace-guide";

export const metadata: Metadata = { title: "Espacio de trabajo" };

/** The way into the workspace: what it is and how to move around; the areas are in the sidebar. */
export default function WorkspacePage() {
  return (
    <Suspense>
      <WorkspaceGuide />
    </Suspense>
  );
}
