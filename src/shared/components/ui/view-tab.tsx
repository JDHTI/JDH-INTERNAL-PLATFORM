import { cn } from "@/shared/lib/utils";

/** One tab of a `role="tablist"` row: underlined when selected. */
export function ViewTab({
  selected,
  onSelect,
  controls,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  controls: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      aria-controls={selected ? controls : undefined}
      onClick={onSelect}
      className={cn(
        "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        selected
          ? "border-primary text-text-primary"
          : "border-transparent text-text-secondary hover:text-text-primary"
      )}
    >
      {children}
    </button>
  );
}
