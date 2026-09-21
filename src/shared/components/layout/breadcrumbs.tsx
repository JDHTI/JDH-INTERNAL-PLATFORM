"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

import {
  AREAS,
  findModuleByPath,
  findUtilityLinkByPath,
} from "@/shared/config/areas.config";
import { cn } from "@/shared/lib/utils";

/** Turns an unmatched URL segment into something a person can read. */
function segmentToLabel(segment: string): string {
  const decoded = decodeURIComponent(segment).replace(/[-_]/g, " ");
  return decoded.charAt(0).toUpperCase() + decoded.slice(1);
}

function labelForHref(href: string, segment: string): string {
  const area = AREAS.find((candidate) => candidate.path === href);
  if (area) return area.name;

  return (
    findModuleByPath(href)?.name ??
    findUtilityLinkByPath(href)?.name ??
    segmentToLabel(segment)
  );
}

/**
 * Trail for the current route. Area routes lead with their area; the
 * platform-wide utilities stand on their own, so there is no artificial
 * "home" crumb above either of them.
 */
export default function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  const crumbs = segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/");
    return {
      href,
      label: labelForHref(href, segment),
      isLast: index === segments.length - 1,
    };
  });

  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Ruta de navegación" className="min-w-0 flex-1">
      <ol className="flex items-center gap-1.5 overflow-hidden">
        {crumbs.map((crumb, index) => (
          <li key={crumb.href} className="flex min-w-0 items-center gap-1.5">
            {index > 0 && (
              <ChevronRight
                className="size-3.5 shrink-0 text-text-secondary"
                aria-hidden="true"
              />
            )}

            {crumb.isLast ? (
              <span
                aria-current="page"
                className="truncate text-sm font-semibold text-text-primary"
              >
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className={cn(
                  "truncate rounded-sm text-sm font-medium text-text-secondary",
                  "transition-colors duration-150 hover:text-text-primary",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                )}
              >
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
