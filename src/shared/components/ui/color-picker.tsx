"use client";

import { useId, useState } from "react";

import { useRecentColors } from "@/shared/hooks/use-recent-colors";
import { hexToRgb, normalizeHex, parseChannel, rgbToHex } from "@/shared/lib/color";
import { cn } from "@/shared/lib/utils";

import { Input } from "./input";

type Channel = "r" | "g" | "b";

const CHANNELS: { key: Channel; label: string }[] = [
  { key: "r", label: "R" },
  { key: "g", label: "G" },
  { key: "b", label: "B" },
];

interface Draft {
  hex: string;
  r: string;
  g: string;
  b: string;
}

function toDraft(value: string | null): Draft {
  if (!value) return { hex: "", r: "", g: "", b: "" };
  const { r, g, b } = hexToRgb(value);
  return { hex: value, r: String(r), g: String(g), b: String(b) };
}

/**
 * Keeps what the person is typing when it already means the new value
 * ("1D4ED8" stays as typed instead of jumping to "#1d4ed8" under the cursor),
 * and rewrites only the fields that disagree with it.
 */
function reconcile(draft: Draft, value: string | null): Draft {
  const next = toDraft(value);
  if (!value) return next;
  const rgb = hexToRgb(value);
  return {
    hex: normalizeHex(draft.hex) === value ? draft.hex : next.hex,
    r: parseChannel(draft.r) === rgb.r ? draft.r : next.r,
    g: parseChannel(draft.g) === rgb.g ? draft.g : next.g,
    b: parseChannel(draft.b) === rgb.b ? draft.b : next.b,
  };
}

/**
 * Hex and RGB entry for one color, plus the colors this person used last.
 * Controlled: `value` is a normalized "#rrggbb" or null (no color yet), and
 * `onChange` only ever receives a valid one. The swatch opens the system
 * palette, so dragging to a color needs no custom canvas.
 *
 * A popover hosting it should focus `[data-color-picker-hex]` on open:
 * typing a code is the common case, and focusing the swatch first would
 * open the system palette on the next Enter.
 *
 * The picker never records recents on its own: the consumer calls
 * `useRecentColors().remember` when the color is actually saved, or every
 * shade crossed while dragging would push the useful ones out.
 */
export function ColorPicker({
  value,
  onChange,
  className,
}: {
  value: string | null;
  onChange: (hex: string) => void;
  className?: string;
}) {
  const id = useId();
  const { colors: recent } = useRecentColors();
  const [draft, setDraft] = useState(() => toDraft(value));
  const [syncedValue, setSyncedValue] = useState(value);

  // A new value from outside (a recent swatch, the system palette, the
  // parent resetting) rewrites the fields; adjusting during render avoids a
  // frame where they show the old color.
  if (value !== syncedValue) {
    setSyncedValue(value);
    setDraft(reconcile(draft, value));
  }

  const hexInvalid = draft.hex !== "" && normalizeHex(draft.hex) === null;

  const changeHex = (text: string) => {
    setDraft((current) => ({ ...current, hex: text }));
    // Six digits commit while typing; three wait for blur, or typing
    // "1d4" on the way to "1d4ed8" would turn into "#1144dd".
    const digits = text.trim().replace(/^#/, "");
    const hex = digits.length === 6 ? normalizeHex(text) : null;
    if (hex) onChange(hex);
  };

  const commitShortHex = () => {
    const hex = normalizeHex(draft.hex);
    if (hex && hex !== value) onChange(hex);
  };

  const changeChannel = (channel: Channel, text: string) => {
    const nextDraft = { ...draft, [channel]: text };
    setDraft(nextDraft);
    const rgb = {
      r: parseChannel(nextDraft.r),
      g: parseChannel(nextDraft.g),
      b: parseChannel(nextDraft.b),
    };
    if (rgb.r !== null && rgb.g !== null && rgb.b !== null) {
      onChange(rgbToHex({ r: rgb.r, g: rgb.g, b: rgb.b }));
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-end gap-3">
        <label
          className={cn(
            "relative size-11 shrink-0 cursor-pointer overflow-hidden rounded-md border",
            "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring",
            value ? "border-border-control" : "border-dashed border-border-control"
          )}
          style={value ? { backgroundColor: value } : undefined}
          title="Elegir en la paleta"
        >
          <span className="sr-only">Elegir en la paleta del sistema</span>
          <input
            type="color"
            value={value ?? "#000000"}
            onChange={(event) => {
              const hex = normalizeHex(event.target.value);
              if (hex) onChange(hex);
            }}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </label>

        <div className="min-w-0 flex-1 space-y-1.5">
          <label htmlFor={`${id}-hex`} className="block text-[13px] font-medium">
            Hex
          </label>
          <Input
            id={`${id}-hex`}
            value={draft.hex}
            onChange={(event) => changeHex(event.target.value)}
            onBlur={commitShortHex}
            placeholder="#1d4ed8"
            maxLength={7}
            spellCheck={false}
            autoComplete="off"
            aria-invalid={hexInvalid || undefined}
            aria-describedby={hexInvalid ? `${id}-hex-error` : undefined}
            data-color-picker-hex=""
            className="font-mono"
          />
        </div>
      </div>
      {hexInvalid && (
        <p id={`${id}-hex-error`} className="text-[13px] text-danger">
          Usa seis dígitos hexadecimales, por ejemplo #1d4ed8.
        </p>
      )}

      <div className="grid grid-cols-3 gap-2">
        {CHANNELS.map(({ key, label }) => (
          <div key={key} className="space-y-1.5">
            <label htmlFor={`${id}-${key}`} className="block text-[13px] font-medium">
              {label}
            </label>
            <Input
              id={`${id}-${key}`}
              value={draft[key]}
              onChange={(event) => changeChannel(key, event.target.value)}
              inputMode="numeric"
              maxLength={3}
              placeholder="0–255"
              autoComplete="off"
              className="tabular"
            />
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <p id={`${id}-recent`} className="text-[13px] font-medium">
          Recientes
        </p>
        {recent.length === 0 ? (
          <p className="text-[13px] text-text-secondary">
            Los colores que guardes aparecen aquí.
          </p>
        ) : (
          <div role="group" aria-labelledby={`${id}-recent`} className="flex flex-wrap gap-2">
            {recent.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => onChange(color)}
                aria-label={`Usar ${color}`}
                aria-pressed={color === value}
                title={color}
                style={{ backgroundColor: color }}
                className={cn(
                  "size-8 rounded-md border border-border-control max-md:size-11",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  color === value && "outline-2 outline-offset-2 outline-ring"
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
