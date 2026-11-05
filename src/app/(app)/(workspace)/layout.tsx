import { Toaster } from "sonner";

import { requireUser } from "@/intranet/lib/auth";
import AppLayoutFrame from "@/shared/components/layout/app-layout-frame";

/**
 * The workspace: one area at a time, with its modules in the sidebar. See
 * docs/DESIGN.md §5.3. Like the general view, it needs a session before
 * anything renders; each area then checks its own access in its layout.
 */
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  await requireUser();

  return (
    <>
      <AppLayoutFrame>{children}</AppLayoutFrame>
      <Toaster position="bottom-right" closeButton />
    </>
  );
}
