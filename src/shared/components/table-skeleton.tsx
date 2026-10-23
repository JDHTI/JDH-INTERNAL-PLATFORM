/** Loading state shaped like the table rows it stands in for (DESIGN.md §8). */
export default function TableSkeleton({ rows = 5, label }: { rows?: number; label: string }) {
  return (
    <div className="space-y-2" aria-busy="true">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="h-10 animate-pulse rounded-md bg-canvas-subtle" />
      ))}
    </div>
  );
}
