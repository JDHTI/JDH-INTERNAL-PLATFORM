/** One heading per page, what it answers in one line, and room on the right for a status or an action. */
export default function PageHeader({
  title,
  description,
  aside,
}: {
  title: string;
  description: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="max-w-prose text-sm text-text-secondary">{description}</p>
      </div>
      {aside}
    </div>
  );
}
