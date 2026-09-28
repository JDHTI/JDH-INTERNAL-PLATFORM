"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { useAreas } from "@/features/areas/hooks/use-areas";
import type { Area } from "@/features/areas/types/area.types";
import {
  findModuleByPath,
  findUtilityLinkByPath,
} from "@/shared/config/areas.config";
import { cn } from "@/shared/lib/utils";
import { useBreadcrumbStore } from "@/shared/store/use-breadcrumb-store";

/** Turns an unmatched URL segment into something a person can read. */
function segmentToLabel(segment: string): string {
  const decoded = decodeURIComponent(segment).replace(/[-_]/g, " ");
  return decoded.charAt(0).toUpperCase() + decoded.slice(1);
}

function labelForHref(
  href: string,
  segment: string,
  areas: Area[],
  registered: Record<string, string>
): string {
  const area = areas.find((candidate) => candidate.path === href);
  if (area) return area.name;

  return (
    registered[href] ??
    findModuleByPath(href)?.name ??
    findUtilityLinkByPath(href)?.name ??
    segmentToLabel(segment)
  );
}

/**
 * Trail for the current route. Area routes lead with their area; the
 * platform-wide utilities stand on their own, so there is no artificial
 * "home" crumb above either of them.
 *
 * Coloured with the sidebar tokens, not the canvas ones, because the header
 * carries the sidebar surface. Dropping this on a light surface would leave
 * it unreadable.
 */
export default function Breadcrumbs() {
  const pathname = usePathname();
  const { data: areas = [] } = useAreas();
  const registered = useBreadcrumbStore((state) => state.labels);
  const segments = pathname.split("/").filter(Boolean);

  const crumbs = segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/");
    return {
      href,
      label: labelForHref(href, segment, areas, registered),
      isLast: index === segments.length - 1,
    };
  });

  return (
    <nav aria-label="Ruta de navegación" className="min-w-0 flex-1">
      <ol className="flex items-center gap-2 overflow-hidden">
        {/* The mark opens every trail and is a real link home, not an
            ornament parked in front of the crumbs. */}
        <li className="flex shrink-0 items-center">
          <Link
            href="/"
            aria-label="Inicio"
            className="flex items-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-foreground"
          >
            {/* Sized at what it actually renders, not at the source's
                1024px: the declared width is what drives the srcset, so
                intrinsic dimensions here would ship a 2048px PNG for a 20px
                mark. The link carries the label, so the image is decorative. */}
            <Image
              src="/logos/mark-white.png"
              alt=""
              width={26}
              height={26}
              priority
              className="size-6.5"
            />
          </Link>
        </li>

        {crumbs.map((crumb) => (
          <li key={crumb.href} className="flex min-w-0 items-center gap-2">
            <ChevronRight
              className="size-4 shrink-0 text-sidebar-muted"
              aria-hidden="true"
            />

            {crumb.isLast ? (
              <span
                aria-current="page"
                className="truncate text-base font-semibold text-sidebar-foreground"
              >
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className={cn(
                  "truncate rounded-sm text-base font-medium text-sidebar-muted",
                  "transition-colors duration-150 hover:text-sidebar-foreground",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-foreground"
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
