import { cn } from "@/shared/lib/utils";

/** Shared look for every icon-only control in the header. */
export const headerIconButtonClass = cn(
  "flex size-8 shrink-0 items-center justify-center rounded-md",
  "text-sidebar-muted transition-colors duration-150",
  "hover:bg-sidebar-hover hover:text-sidebar-foreground",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-foreground"
);
