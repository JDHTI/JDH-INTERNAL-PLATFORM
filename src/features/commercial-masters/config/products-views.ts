import type { PageView } from "@/shared/components/page-header";

/** The views of the products page, by their `?vista=` value; the master has none. */
export type ProductsView = "maestro" | "alzas" | "analisis";

/** `?vista=` as the page reads it; anything else is the master. */
export function productsView(value: string | undefined): ProductsView {
  return value === "alzas" || value === "analisis" ? value : "maestro";
}

/** What the increase history and its analysis show; also under Costos > Acumulado de alzas. */
export const INCREASE_VIEW_DESCRIPTIONS = {
  history: "Alzas que notifican los proveedores y si ya están en SIESA.",
  analysis: "Cuánto subió cada referencia en el periodo, cada cuánto sube y cómo terminó su último cambio.",
} as const;

/**
 * The products master, the increase history and its analysis, for the page
 * header. Access to the module opens all three; only editing asks for more
 * (managing the masters).
 */
export function productsViews(path: string, masterDescription: string): PageView[] {
  return [
    { key: "maestro", label: "Maestro de productos", href: path, description: masterDescription },
    {
      key: "alzas",
      label: "Histórico de alzas",
      href: `${path}?vista=alzas`,
      description: INCREASE_VIEW_DESCRIPTIONS.history,
    },
    {
      key: "analisis",
      label: "Análisis de alzas",
      href: `${path}?vista=analisis`,
      description: INCREASE_VIEW_DESCRIPTIONS.analysis,
    },
  ];
}
