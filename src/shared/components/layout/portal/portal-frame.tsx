import Link from "next/link";

import PortalHeader from "./portal-header";

/**
 * The general view's frame. Unlike the workspace, the document scrolls: these
 * pages are read top to bottom, not worked on beside a fixed sidebar.
 */
export default function PortalFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-text-primary">
      <PortalHeader />
      <main className="mx-auto w-full max-w-300 flex-1 px-4 py-6 md:px-6 md:py-10">{children}</main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-300 flex-col gap-2 px-4 py-6 text-sm text-text-secondary sm:flex-row sm:items-center sm:justify-between md:px-6">
          <p>Juan D. Hoyos Distribuciones · Plataforma interna</p>
          <Link
            href="/sugerencias"
            className="inline-flex min-h-11 items-center underline underline-offset-2 hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:min-h-0"
          >
            Sugerencias para la plataforma
          </Link>
        </div>
      </footer>
    </div>
  );
}
