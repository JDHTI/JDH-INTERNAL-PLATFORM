"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

import { HOME_PATH, findModuleByPath } from "@/shared/config/modules.config";
import { cn } from "@/shared/lib/utils";

/** Turns an unmatched URL segment into something a person can read. */
function segmentToLabel(segment: string): string {
  const decoded = decodeURIComponent(segment).replace(/[-_]/g, " ");
  return decoded.charAt(0).toUpperCase() + decoded.slice(1);
}

interface Crumb {
  href: string;
  label: string;
  isLast: boolean;
}

export default function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  const crumbs: Crumb[] = segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/");
    return {
      href,
      label: findModuleByPath(href)?.name ?? segmentToLabel(segment),
      isLast: index === segments.length - 1,
    };
  });

  const linkClasses = cn(
    "truncate rounded-sm text-sm font-medium text-text-secondary",
    "transition-colors duration-150 hover:text-text-primary",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
  );

  return (
    <nav aria-label="Ruta de navegación" className="min-w-0 flex-1">
      <ol className="flex items-center gap-1.5 overflow-hidden">
        <li className="shrink-0">
          {crumbs.length === 0 ? (
            <span
              aria-current="page"
              className="flex items-center gap-1.5 text-sm font-semibold text-text-primary"
            >
              <Home className="size-4" aria-hidden="true" />
              Inicio
            </span>
          ) : (
            <Link
              href={HOME_PATH}
              className={cn(linkClasses, "flex items-center")}
              aria-label="Inicio"
            >
              <Home className="size-4" aria-hidden="true" />
            </Link>
          )}
        </li>

        {crumbs.map((crumb) => (
          <li key={crumb.href} className="flex min-w-0 items-center gap-1.5">
            <ChevronRight
              className="size-3.5 shrink-0 text-text-secondary"
              aria-hidden="true"
            />
            {crumb.isLast ? (
              <span
                aria-current="page"
                className="truncate text-sm font-semibold text-text-primary"
              >
                {crumb.label}
              </span>
            ) : (
              <Link href={crumb.href} className={linkClasses}>
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
