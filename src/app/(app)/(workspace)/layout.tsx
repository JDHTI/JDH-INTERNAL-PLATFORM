import { Toaster } from "sonner";

import AppLayoutFrame from "@/shared/components/layout/app-layout-frame";

/** The workspace: one area at a time, with its modules in the sidebar. See docs/DESIGN.md §5.3. */
export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppLayoutFrame>{children}</AppLayoutFrame>
      <Toaster position="bottom-right" closeButton />
    </>
  );
}
