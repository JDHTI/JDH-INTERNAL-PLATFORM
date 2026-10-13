"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { useCatalog, useFeedbackSummary } from "@/features/pqrsf/hooks/use-pqrsf";
import { isModuleActive, moduleHref, type ModuleItem } from "@/shared/config/areas.config";
import { cn } from "@/shared/lib/utils";
import SidebarRow from "./sidebar-row";

interface SidebarModuleGroupProps {
  module: ModuleItem;
  onNavigate: () => void;
}

/**
 * A module with pages under it. Same two-control card as the area switcher:
 * the label navigates to the module, the chevron opens its pages, and the
 * whole square is highlighted while it is open.
 *
 * Link and chevron are siblings, not nested, for the same reason as in the
 * area switcher: a button inside a link is invalid markup.
 *
 * The rail collapsed shows just the module link; the pages are reachable from
 * the module's own screen.
 */
export default function SidebarModuleGroup({
  module,
  onNavigate,
}: SidebarModuleGroupProps) {
  const pathname = usePathname();
  const panelId = useId();
  const { data: catalog } = useCatalog();
  // null = the user has not touched it, so it follows the route: inside the
  // module the pages are shown, elsewhere they are tucked away.
  const [toggled, setToggled] = useState<boolean | null>(null);

  const subItems = (module.subItems ?? []).filter(
    (item) => !item.managerOnly || catalog?.is_manager
  );
  const feedback = useFeedbackSummary(
    catalog?.is_manager === true && subItems.some((item) => item.badge === "feedback-unread")
  );
  const unread = feedback.data?.unread ?? 0;
  const isInside =
    pathname === module.path || pathname.startsWith(`${module.path}/`);
  const isOpen = subItems.length > 0 && (toggled ?? isInside);
  const hasPage = module.hasPage !== false;
  const isModulePage = hasPage && pathname === module.path;
  const Icon = module.icon;

  if (subItems.length === 0) {
    return (
      <SidebarRow
        href={moduleHref(module)}
        label={module.name}
        icon={module.icon}
        isActive={isModuleActive(module, pathname)}
        isCollapsed={false}
        onNavigate={onNavigate}
      />
    );
  }

  // Lit like a selected row only while the route is the module or one of its
  // pages; otherwise it is as quiet as every other row, open or not.
  const labelClass = cn(
    // Same padding, icon and gap as SidebarRow, so the icon and the label
    // line up with the plain rows above and below.
    "flex h-9 min-w-0 flex-1 items-center gap-2.5 rounded-md px-2 text-left text-sm font-medium transition-colors duration-150",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-foreground",
    isInside ? "text-sidebar-foreground" : "text-sidebar-muted hover:text-sidebar-foreground"
  );
  const labelContent = (
    <>
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="truncate">{module.name}</span>
      {/* The tray is closed: the unread count would otherwise be hidden. */}
      {!isOpen && unread > 0 && (
        <span
          className="size-2 shrink-0 rounded-full bg-sidebar-foreground"
          role="img"
          aria-label={`${unread} sin leer`}
        />
      )}
    </>
  );

  return (
    <div>
      <div
        className={cn(
          "flex h-9 items-center transition-colors duration-150",
          // Squared underneath while the pages are open, so the row and its
          // tray read as one component.
          isOpen ? "rounded-t-md" : "rounded-md",
          isInside ? "bg-sidebar-active" : "hover:bg-sidebar-hover"
        )}
      >
        {hasPage ? (
          <Link
            href={module.path}
            onClick={onNavigate}
            aria-current={isModulePage ? "page" : undefined}
            className={labelClass}
          >
            {labelContent}
          </Link>
        ) : (
          // No screen behind the label: a click anywhere on the row only opens
          // and closes the pages, like the chevron, and navigates nowhere.
          <button
            type="button"
            onClick={() => setToggled(!isOpen)}
            aria-expanded={isOpen}
            aria-controls={isOpen ? panelId : undefined}
            className={labelClass}
          >
            {labelContent}
          </button>
        )}

        <button
          type="button"
          onClick={() => setToggled(!isOpen)}
          aria-expanded={isOpen}
          aria-controls={isOpen ? panelId : undefined}
          aria-label={`Páginas de ${module.name}`}
          className={cn(
            // Flat on the row until the pointer is over it: no contrast at rest.
            "mr-1 flex size-7 shrink-0 items-center justify-center rounded-sm text-sidebar-muted transition-colors duration-150",
            "hover:bg-sidebar-foreground/20 hover:text-sidebar-foreground",
            "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sidebar-foreground"
          )}
        >
          <ChevronDown
            className={cn(
              "size-4 transition-transform duration-150",
              isOpen && "rotate-180"
            )}
            aria-hidden="true"
          />
        </button>
      </div>

      {isOpen && (
        // A step lighter than the sidebar but under the row's own fill, so the
        // pages read as a tray under the module and not as more rows of the
        // same level; flush with the row above and rounded only at the bottom.
        // No padding: the selected page fills the row edge to edge.
        <ul id={panelId} className="overflow-hidden rounded-b-md bg-sidebar-subtle">
          {subItems.map((item) => (
            <li key={item.id}>
              <SidebarRow
                href={item.path}
                label={item.name}
                icon={item.icon}
                isActive={pathname === item.path}
                isCollapsed={false}
                onNavigate={onNavigate}
                className="rounded-none"
                badge={item.badge === "feedback-unread" ? unread : undefined}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
