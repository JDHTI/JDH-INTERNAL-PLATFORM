import { Toaster } from "sonner";

import QueryProvider from "@/shared/components/providers/query-provider";
import ThemeSync from "@/shared/components/providers/theme-sync";

/**
 * Providers above both shells, `(general)` and `(workspace)`, so moving between
 * them keeps the query cache.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <ThemeSync />
      {children}
      <Toaster position="bottom-right" closeButton />
    </QueryProvider>
  );
}
