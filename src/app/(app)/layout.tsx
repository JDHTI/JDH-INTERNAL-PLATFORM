import QueryProvider from "@/shared/components/providers/query-provider";
import ThemeSync from "@/shared/components/providers/theme-sync";

/**
 * Providers above both shells, `(general)` and `(workspace)`, so moving between
 * them keeps the query cache and the theme. Each shell mounts its own toaster,
 * styled like the rest of that shell.
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
    </QueryProvider>
  );
}
