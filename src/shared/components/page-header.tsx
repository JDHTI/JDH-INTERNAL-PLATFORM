import Link from "next/link";

import { cn } from "@/shared/lib/utils";

/** One view of a page: its own address, its name in the header and what it answers. */
export interface PageView {
  key: string;
  label: string;
  href: string;
  description?: React.ReactNode;
}

const TITLE = "text-2xl font-semibold tracking-tight max-md:text-xl";

/**
 * The header of every workspace page: one heading, what the page answers in
 * one line, and room on the right for a status or an action.
 *
 * With `views`, the page has several views (the products master, its
 * increase history and its analysis): their names take the heading's place,
 * same type, as links, so each view has its own address and works without
 * client state. The current one is the page's heading for screen readers and
 * its description is the line below; without one of its own, `description`.
 */
export default function PageHeader({
  title,
  description,
  aside,
  views,
  current,
  viewsLabel,
}: {
  description?: React.ReactNode;
  aside?: React.ReactNode;
} & (
  | { title: string; views?: undefined; current?: undefined; viewsLabel?: undefined }
  | {
      title?: undefined;
      views: PageView[];
      /** `key` of the view on screen; the first one when it matches none. */
      current: string;
      /** Accessible name of the views' navigation, such as «Vistas de productos». */
      viewsLabel: string;
    }
)) {
  const active = views ? (views.find((view) => view.key === current) ?? views[0]) : undefined;
  const line = active?.description ?? description;
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className={cn("min-w-0", views ? "space-y-2" : "space-y-1")}>
        {views && active ? (
          <>
            <h1 className="sr-only">{active.label}</h1>
            <nav aria-label={viewsLabel} className="flex flex-wrap gap-x-6 border-b border-border">
              {views.map((view) => (
                <Link
                  key={view.key}
                  href={view.href}
                  aria-current={view.key === active.key ? "page" : undefined}
                  className={cn(
                    TITLE,
                    "-mb-px rounded-t-sm border-b-2 pb-2 transition-colors",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    view.key === active.key
                      ? "border-primary text-text-primary"
                      : "border-transparent text-text-secondary hover:text-text-primary"
                  )}
                >
                  {view.label}
                </Link>
              ))}
            </nav>
          </>
        ) : (
          <h1 className={TITLE}>{title}</h1>
        )}
        {line && <p className="max-w-prose text-sm text-text-secondary">{line}</p>}
      </div>
      {aside}
    </div>
  );
}
