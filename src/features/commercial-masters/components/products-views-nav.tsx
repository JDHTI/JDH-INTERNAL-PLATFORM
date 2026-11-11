import Link from "next/link";

import { cn } from "@/shared/lib/utils";

export const INCREASES_VIEW = "alzas";

/**
 * The two views of the products master at the top of the page, in place of a
 * title: the master and the price increase history. Links, not tabs: each view
 * has its own address (`?vista=alzas`) and works without client state.
 */
export default function ProductsViewsNav({ path, increases }: { path: string; increases: boolean }) {
  return (
    <>
      <h1 className="sr-only">{increases ? "Histórico de alzas" : "Maestro de productos"}</h1>
      <nav aria-label="Vistas de productos" className="flex flex-wrap gap-x-6 border-b border-border">
        <ViewLink href={path} current={!increases}>
          Maestro de productos
        </ViewLink>
        <ViewLink href={`${path}?vista=${INCREASES_VIEW}`} current={increases}>
          Histórico de alzas
        </ViewLink>
      </nav>
    </>
  );
}

function ViewLink({ href, current, children }: { href: string; current: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={cn(
        "-mb-px rounded-t-sm border-b-2 pb-2 text-2xl font-semibold tracking-tight transition-colors max-md:text-xl",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        current ? "border-primary text-text-primary" : "border-transparent text-text-secondary hover:text-text-primary"
      )}
    >
      {children}
    </Link>
  );
}
