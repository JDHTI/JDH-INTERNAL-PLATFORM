"use client";

import { usePathname } from "next/navigation";

import AppHeader from "./app-header";
import Sidebar from "./sidebar/sidebar";

function isAdministrationPath(pathname: string) {
  return pathname === "/administracion" || pathname.startsWith("/administracion/");
}

/**
 * The normal frame stays shared across the intranet. Administration uses the
 * same header and content surface, but removes the area sidebar so its own
 * horizontal navigation is the only section navigation on screen.
 */
export default function AppLayoutFrame({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdministration = isAdministrationPath(pathname);

  return (
    <div className="app-shell flex overflow-hidden bg-canvas text-text-primary">
      {!isAdministration && <Sidebar />}

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
