"use client";

import { Switch as BaseSwitch } from "@base-ui/react/switch";

import { cn } from "@/shared/lib/utils";

/**
 * On/off for a setting that applies at once. The off track is
 * `--text-secondary`, not `--border-control`: in dark mode the border token
 * stays under the 3:1 a control needs. The thumb's side carries the state, so
 * it never depends on color alone.
 */
export function Switch({
  checked,
  onCheckedChange,
  disabled = false,
  className,
  ...props
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
}) {
  return (
    <BaseSwitch.Root
      checked={checked}
      onCheckedChange={(next) => onCheckedChange(next)}
      disabled={disabled}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full bg-text-secondary p-0.5 transition-colors duration-150",
        "data-[checked]:bg-primary data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        // A 44px touch target around the small track.
        "before:absolute before:-inset-3 before:content-['']",
        className
      )}
      {...props}
    >
      <BaseSwitch.Thumb className="size-4 rounded-full bg-text-on-primary transition-transform duration-150 data-[checked]:translate-x-4 motion-reduce:transition-none" />
    </BaseSwitch.Root>
  );
}
