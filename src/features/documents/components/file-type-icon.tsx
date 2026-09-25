import { cn } from "@/shared/lib/utils";

type Family = "pdf" | "doc" | "sheet" | "slide" | "image" | "archive" | "text";

const FAMILY_BY_EXTENSION: Record<string, Family> = {
  pdf: "pdf",
  doc: "doc",
  docx: "doc",
  xls: "sheet",
  xlsx: "sheet",
  xlsm: "sheet",
  csv: "sheet",
  ppt: "slide",
  pptx: "slide",
  png: "image",
  jpg: "image",
  jpeg: "image",
  zip: "archive",
  txt: "text",
};

/** Name people recognize; it goes in the tooltip, next to the bare extension. */
const FAMILY_LABEL: Record<Family, string> = {
  pdf: "Documento PDF",
  doc: "Documento de Word",
  sheet: "Hoja de cálculo",
  slide: "Presentación",
  image: "Imagen",
  archive: "Archivo comprimido",
  text: "Texto plano",
};

// Full class names so Tailwind picks them up; the tokens live in globals.css.
const SHEET_FILL: Record<Family, string> = {
  pdf: "fill-file-pdf",
  doc: "fill-file-doc",
  sheet: "fill-file-sheet",
  slide: "fill-file-slide",
  image: "fill-file-image",
  archive: "fill-file-other",
  text: "fill-file-other",
};

export function fileFamilyLabel(extension: string): string {
  return FAMILY_LABEL[FAMILY_BY_EXTENSION[extension.toLowerCase()] ?? "text"];
}

/**
 * A page with a folded corner, colored by family (red PDF, blue Word, green
 * spreadsheet, orange slides, violet image) with a mark for the kind of
 * content inside. Decorative: the extension is always written next to it, so
 * color is never the only cue and screen readers skip it.
 */
export default function FileTypeIcon({
  extension,
  className,
}: {
  extension: string;
  className?: string;
}) {
  const family = FAMILY_BY_EXTENSION[extension.toLowerCase()] ?? "text";

  return (
    <svg
      viewBox="0 0 20 24"
      aria-hidden="true"
      className={cn("h-6 w-5 shrink-0", className)}
    >
      <path
        className={SHEET_FILL[family]}
        d="M3 0h9.5L20 7.5V21a3 3 0 0 1-3 3H3a3 3 0 0 1-3-3V3a3 3 0 0 1 3-3z"
      />
      <path className="fill-file-mark opacity-40" d="M12.5 0 20 7.5h-4.5a3 3 0 0 1-3-3z" />
      <g className="fill-file-mark stroke-file-mark">
        <Mark family={family} />
      </g>
    </svg>
  );
}

function Mark({ family }: { family: Family }) {
  switch (family) {
    case "sheet":
      return (
        <g fill="none" strokeWidth="1.4">
          <rect x="4" y="11" width="12" height="8.5" rx="1" />
          <path d="M10 11v8.5M4 15.25h12" />
        </g>
      );
    case "slide":
      return (
        <g strokeWidth="1.4">
          <rect x="4" y="11" width="12" height="7.5" rx="1" fill="none" />
          <rect x="6.5" y="13.5" width="5" height="2.5" rx="0.5" stroke="none" />
        </g>
      );
    case "image":
      return (
        <g stroke="none">
          <circle cx="7.5" cy="12.5" r="1.6" />
          <path d="M3.5 20 8 15l3 3 2-2 3.5 4z" />
        </g>
      );
    case "archive":
      return (
        <g>
          <path
            stroke="none"
            d="M8.5 9h1.5v1.5H8.5zM10 10.5h1.5V12H10zM8.5 12h1.5v1.5H8.5zM10 13.5h1.5V15H10z"
          />
          <rect x="7.75" y="15.75" width="4.5" height="4" rx="1" fill="none" strokeWidth="1.3" />
        </g>
      );
    default:
      // pdf, doc and text: lines of text; the sheet color tells them apart.
      return (
        <g stroke="none">
          <rect x="4" y="11" width="12" height="1.6" rx="0.8" />
          <rect x="4" y="14.5" width="12" height="1.6" rx="0.8" />
          <rect x="4" y="18" width="8" height="1.6" rx="0.8" />
        </g>
      );
  }
}
