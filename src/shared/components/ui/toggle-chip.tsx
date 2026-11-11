import { cn } from "@/shared/lib/utils";

/**
 * A filter that is on or off, as the validator's status chips: pressed reads
 * as the solid primary, and `aria-pressed` says it to assistive tech.
 */
export function ToggleChip({
  active,
  onClick,
  count,
  disabled,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count?: number | null;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      disabled={disabled}
      title={title}
      className={cn(
        "inline-flex min-h-8 items-center gap-2 rounded-md border px-3 text-sm font-medium whitespace-nowrap transition-colors duration-150 max-md:min-h-11",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50",
        active ? "border-primary bg-primary text-text-on-primary" : "border-border-control hover:bg-canvas-subtle"
      )}
    >
      {children}
      {count !== undefined && count !== null && (
        <span className="tabular-nums opacity-80">{new Intl.NumberFormat("es-CO").format(count)}</span>
      )}
    </button>
  );
}
