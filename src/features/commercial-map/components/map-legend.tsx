import { categoryColor } from "../lib/prospect-features";
import type { PaletteKey } from "../types/commercial-map.types";
import { ProspectMark } from "./prospect-marks";

/**
 * What each mark means, under the map and not over it. Category is the only
 * thing color says; former customer and approximate location are shapes, so
 * they read without it.
 */
export default function MapLegend({
  categories,
  colors,
}: {
  categories: string[];
  colors: Map<string, PaletteKey>;
}) {
  return (
    <ul
      aria-label="Convenciones del mapa"
      className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border bg-surface px-3 py-2 text-[13px] text-text-secondary"
    >
      {categories.map((category) => (
        <li key={category} className="flex items-center gap-1.5">
          <ProspectMark color={categoryColor(colors, category)} />
          {category}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <ProspectMark color="gray" former />
        Ex-cliente
      </li>
      <li className="flex items-center gap-1.5">
        <ProspectMark color="gray" approximate />
        Ubicación aproximada
      </li>
    </ul>
  );
}
