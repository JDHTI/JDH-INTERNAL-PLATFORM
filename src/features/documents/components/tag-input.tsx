"use client";

import { ChevronDown } from "lucide-react";

import { ColorPopover } from "@/shared/components/ui/color-popover";
import { cn } from "@/shared/lib/utils";

import { normalizeTag, parseTags } from "../lib/format";
import { TagColorButton } from "./tag-chip";

/**
 * Tags as chips, with the text being typed and its color on the same row.
 * Enter or a comma turns the text into a chip carrying the color in the
 * square; pasting "a, b, c" makes three. Backspace on an empty field removes
 * the last chip.
 *
 * Fully controlled: the form owns the text too, so a tag typed but not yet
 * turned into a chip still uploads (the square's popover takes focus, so
 * committing on blur would add the tag before its color was chosen).
 */
export function TagInput({
  id,
  describedBy,
  tags,
  draft,
  onDraftChange,
  draftColor,
  onDraftColorChange,
  onAdd,
  onRemove,
  colorOf,
  onTagColorChange,
}: {
  id: string;
  describedBy?: string;
  /** Normalized, in the order added. */
  tags: string[];
  draft: string;
  onDraftChange: (text: string) => void;
  /** Color the next chip gets; null leaves it to the area's color. */
  draftColor: string | null;
  onDraftColorChange: (color: string | null) => void;
  onAdd: (tags: string[]) => void;
  onRemove: (tag: string) => void;
  colorOf: (tag: string) => string | undefined;
  onTagColorChange: (tag: string, color: string | null) => void;
}) {
  const add = (text: string) => {
    const next = parseTags(text).map(normalizeTag);
    if (next.length > 0) onAdd(next);
  };

  const change = (text: string) => {
    // Everything before the last comma is finished; the rest keeps typing.
    const cut = text.lastIndexOf(",");
    if (cut === -1) {
      onDraftChange(text);
      return;
    }
    add(text.slice(0, cut));
    onDraftChange(text.slice(cut + 1).trimStart());
  };

  const keyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      // Enter adds a tag here; it must not submit the upload form.
      event.preventDefault();
      add(draft);
      onDraftChange("");
    } else if (event.key === "Backspace" && draft === "" && tags.length > 0) {
      onRemove(tags[tags.length - 1]);
    }
  };

  const pending = normalizeTag(draft);
  // What the square shows: the color picked for the next tag, or the one the
  // area already has for the text typed so far.
  const squareColor = draftColor ?? (pending ? colorOf(pending) : undefined) ?? null;

  return (
    <div
      className={cn(
        "flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border border-border-control py-1 pr-1 pl-1.5",
        "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring"
      )}
    >
      {tags.length > 0 && (
        <ul className="contents" aria-label="Etiquetas agregadas">
          {tags.map((tag) => (
            <li key={tag} className="min-w-0">
              <TagColorButton
                tag={tag}
                color={colorOf(tag)}
                onSave={(color) => onTagColorChange(tag, color)}
                onRemove={() => onRemove(tag)}
                scopeNote="Se guarda al subir el documento y aplica en todo el área."
              />
            </li>
          ))}
        </ul>
      )}
      <input
        id={id}
        value={draft}
        onChange={(event) => change(event.target.value)}
        onKeyDown={keyDown}
        placeholder={tags.length === 0 ? "contratos, 2026" : "Otra etiqueta"}
        aria-describedby={describedBy}
        autoComplete="off"
        className="h-7 min-w-32 flex-1 bg-transparent px-1 text-sm text-text-primary outline-none placeholder:text-text-secondary"
      />
      <ColorPopover
        color={squareColor}
        // The area's color only shows here; there is nothing to remove until
        // one is picked for the next tag.
        canClear={draftColor !== null}
        onSave={onDraftColorChange}
        title={pending ? `Color de «${pending}»` : "Color de la próxima etiqueta"}
        note="Se aplica al agregar la etiqueta y se guarda al subir el documento."
        triggerLabel={
          pending ? `Color para la etiqueta ${pending}` : "Color para la próxima etiqueta"
        }
        triggerTitle="Elegir color"
        triggerClassName={cn(
          "flex h-7 shrink-0 items-center gap-0.5 rounded-sm px-1 text-text-secondary",
          "hover:bg-canvas-subtle hover:text-text-primary",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          "max-md:h-11 max-md:px-2"
        )}
        trigger={
          <>
            <span
              aria-hidden="true"
              className={cn(
                "size-5 rounded-sm border border-border-control",
                !squareColor && "border-dashed"
              )}
              style={squareColor ? { backgroundColor: squareColor } : undefined}
            />
            <ChevronDown className="size-3.5" aria-hidden="true" />
          </>
        }
      />
    </div>
  );
}
