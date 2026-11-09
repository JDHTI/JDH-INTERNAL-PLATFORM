import AppHeader from "./app-header";
import Sidebar from "./sidebar/sidebar";

/** The workspace frame: area sidebar, header, and a content area with its own scroll. */
export default function AppLayoutFrame({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell flex overflow-hidden bg-canvas text-text-primary print:bg-transparent">
      {/* Printing (a customer document as PDF) keeps only the content. */}
      <div className="contents print:hidden">
        <Sidebar />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden print:block print:overflow-visible">
        <div className="contents print:hidden">
          <AppHeader />
        </div>
        {/* The content area owns the scroll; header and sidebar stay put. */}
        <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6 print:overflow-visible print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
