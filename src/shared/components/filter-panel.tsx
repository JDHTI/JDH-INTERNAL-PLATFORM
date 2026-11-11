import { cn } from "@/shared/lib/utils";

/**
 * Every filter of a view in one panel. `fields` are the inputs, one row from
 * md up: the columns narrow when the sidebar opens instead of wrapping (each
 * field truncates). `chips` sit below at the start and `end` at the other end
 * (a second group of chips, «Limpiar filtros» or an action).
 */
export default function FilterPanel({
  label,
  fields,
  columns = "md:grid-cols-4",
  chips,
  end,
}: {
  /** Accessible name of the panel, such as «Filtros del análisis». */
  label: string;
  fields: React.ReactNode;
  /** Grid template from md up, one column per field: `md:grid-cols-4`. */
  columns?: string;
  chips?: React.ReactNode;
  end?: React.ReactNode;
}) {
  return (
    <section aria-label={label} className="space-y-3 rounded-lg border border-border bg-surface p-3">
      <div className={cn("grid gap-2 sm:grid-cols-2 [&>*]:min-w-0", columns)}>{fields}</div>
      {(chips || end) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">{chips}</div>
          <div className="flex flex-wrap items-center gap-2">{end}</div>
        </div>
      )}
    </section>
  );
}
