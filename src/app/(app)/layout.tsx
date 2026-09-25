import { Toaster } from "sonner";

import AppLayoutFrame from "@/shared/components/layout/app-layout-frame";
import QueryProvider from "@/shared/components/providers/query-provider";
import ThemeSync from "@/shared/components/providers/theme-sync";

/**
 * The application shell. The intranet is the shell: a module renders inside
 * this unified navigation rather than standing up its own login and its own
 * loose URL. See docs/DESIGN.md §5.3.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <ThemeSync />

      <AppLayoutFrame>{children}</AppLayoutFrame>

      <Toaster position="bottom-right" closeButton />
    </QueryProvider>
  );
}
