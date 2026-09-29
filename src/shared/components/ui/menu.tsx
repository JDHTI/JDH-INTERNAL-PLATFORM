"use client";

import { Menu as BaseMenu } from "@base-ui/react/menu";
import { Check } from "lucide-react";

import { cn } from "@/shared/lib/utils";

/**
 * Action menu on Base UI: arrow keys, typeahead, Escape and focus return come
 * with it. Same surface as the dropdown panels (DESIGN.md §6.2).
 */
export function Menu({
  trigger,
  triggerClassName,
  triggerLabel,
  triggerTitle,
  disabled,
  align = "start",
  children,
}: {
  trigger: React.ReactNode;
  triggerClassName?: string;
  triggerLabel?: string;
  triggerTitle?: string;
  disabled?: boolean;
  align?: "start" | "end";
  children: React.ReactNode;
}) {
  return (
    <BaseMenu.Root>
      <BaseMenu.Trigger
        aria-label={triggerLabel}
        title={triggerTitle}
        disabled={disabled}
        className={triggerClassName}
      >
        {trigger}
      </BaseMenu.Trigger>
      <BaseMenu.Portal>
        <BaseMenu.Positioner side="bottom" align={align} sideOffset={4} className="z-50">
          <BaseMenu.Popup className="max-h-80 min-w-48 overflow-y-auto rounded-md border border-border-control bg-surface-raised p-1 text-text-primary shadow-lg outline-none">
            {children}
          </BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  );
}

const itemClass = cn(
  "flex min-h-8 w-full cursor-default items-center gap-2 rounded-sm px-2 text-left text-sm whitespace-nowrap outline-none select-none max-md:min-h-11",
  "data-[highlighted]:bg-canvas-subtle data-[disabled]:opacity-50",
  "[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-text-secondary"
);

export function MenuItem({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <BaseMenu.Item onClick={onClick} disabled={disabled} className={itemClass}>
      {children}
    </BaseMenu.Item>
  );
}

/**
 * One choice among several (a status, for instance): `menuitemradio` items,
 * so assistive tech announces which one is current.
 */
export function MenuRadioGroup({
  value,
  onValueChange,
  label,
  children,
}: {
  value: string;
  onValueChange: (value: string) => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <BaseMenu.RadioGroup
      value={value}
      onValueChange={(next) => {
        if (next !== value) onValueChange(next as string);
      }}
      aria-label={label}
    >
      {children}
    </BaseMenu.RadioGroup>
  );
}

export function MenuRadioItem({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <BaseMenu.RadioItem value={value} closeOnClick className={itemClass}>
      <span className="flex size-4 shrink-0 items-center justify-center">
        <BaseMenu.RadioItemIndicator>
          <Check aria-hidden="true" />
        </BaseMenu.RadioItemIndicator>
      </span>
      {children}
    </BaseMenu.RadioItem>
  );
}

export function MenuLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 pt-1.5 pb-1 text-[11px] font-semibold tracking-[0.06em] text-text-secondary uppercase">
      {children}
    </div>
  );
}

export function MenuSeparator() {
  return <BaseMenu.Separator className="my-1 h-px bg-border" />;
}
