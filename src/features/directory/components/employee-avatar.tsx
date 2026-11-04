import { getInitials } from "@/features/session/types/session.types";
import { cn } from "@/shared/lib/utils";

import { employeePhotoUrl, type EmployeeSummary } from "../types/directory.types";

const SIZES = {
  sm: "size-8 text-[11px]",
  md: "size-10 text-xs",
  lg: "size-24 text-2xl",
} as const;

/** Decorative: the name always sits next to it, so the image has empty alt text. */
export default function EmployeeAvatar({
  employee,
  size = "sm",
  className,
}: {
  employee: Pick<EmployeeSummary, "id" | "full_name" | "photo_version">;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  // 432 px only where the photo is shown large; the list never pays for it.
  const src = employeePhotoUrl(employee, size === "lg" ? 432 : 96);
  const box = cn("shrink-0 rounded-md", SIZES[size], className);

  if (src) {
    return (
      // next/image would fetch it from a server that has no session cookie.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" loading="lazy" className={cn(box, "object-cover")} />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        box,
        "flex items-center justify-center bg-canvas-subtle font-semibold text-text-primary"
      )}
    >
      {getInitials(employee.full_name)}
    </span>
  );
}
