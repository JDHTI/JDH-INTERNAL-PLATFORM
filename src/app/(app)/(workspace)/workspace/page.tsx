import type { Metadata } from "next";
import { Suspense } from "react";

import WorkspaceHub from "@/features/areas/components/workspace-hub";

export const metadata: Metadata = { title: "Espacio de trabajo" };

/** The way into the workspace: the areas the person may enter, and nothing else. */
export default function WorkspacePage() {
  return (
    <Suspense>
      <WorkspaceHub />
    </Suspense>
  );
}
