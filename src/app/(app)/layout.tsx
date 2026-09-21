import { Toaster } from "sonner";

import AppHeader from "@/shared/components/layout/app-header";
import Sidebar from "@/shared/components/layout/sidebar/sidebar";
import QueryProvider from "@/shared/components/providers/query-provider";

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
      <div className="app-shell flex overflow-hidden bg-canvas text-text-primary">
        <Sidebar />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <AppHeader />
          {/* The content area owns the scroll; header and sidebar stay put. */}
          <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>

      <Toaster position="bottom-right" closeButton />
    </QueryProvider>
  );
}
