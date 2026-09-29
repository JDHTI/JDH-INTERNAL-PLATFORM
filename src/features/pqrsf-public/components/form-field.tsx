import { cn } from "@/shared/lib/utils";

export function FormField({
  id,
  label,
  optional = false,
  hint,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="block text-[13px] font-medium leading-[1.4] tracking-normal">
        {label}
        {!optional && <span className="ml-0.5 text-danger" aria-hidden="true">*</span>}
        {optional && <span className="font-normal text-text-secondary"> (opcional)</span>}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-[13px] text-text-secondary">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function describedBy(id: string, hasHint: boolean, hasError = false) {
  const ids = [];
  if (hasHint) ids.push(`${id}-hint`);
  if (hasError) ids.push(`${id}-error`);
  return ids.length > 0 ? ids.join(" ") : undefined;
}
