import AppHeader from "./app-header";
import Sidebar from "./sidebar/sidebar";

/** The workspace frame: area sidebar, header, and a content area with its own scroll. */
export default function AppLayoutFrame({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell flex overflow-hidden bg-canvas text-text-primary">
      <Sidebar />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader />
        {/* The content area owns the scroll; header and sidebar stay put. */}
        <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
