import Link from "next/link";

import { cn } from "@/shared/lib/utils";

/** The views of the products page, by their `?vista=` value; the master has none. */
export type ProductsView = "maestro" | "alzas" | "analisis";

const VIEWS: { view: ProductsView; label: string; query: string }[] = [
  { view: "maestro", label: "Maestro de productos", query: "" },
  { view: "alzas", label: "Histórico de alzas", query: "?vista=alzas" },
  { view: "analisis", label: "Análisis de alzas", query: "?vista=analisis" },
];

export const VIEW_DESCRIPTIONS: Record<Exclude<ProductsView, "maestro">, string> = {
  alzas: "Alzas que notifican los proveedores y si ya están en SIESA.",
  analisis: "Cuánto subió cada referencia en el periodo, cada cuánto sube y cómo terminó su último cambio.",
};

/** `?vista=` as the page reads it; anything else is the master. */
export function productsView(value: string | undefined): ProductsView {
  return value === "alzas" || value === "analisis" ? value : "maestro";
}

/**
 * The views of the products master at the top of the page, in place of a
 * title. Links, not tabs: each view has its own address and works without
 * client state. Access to the module opens all three; only editing asks for
 * more (managing the masters).
 */
export default function ProductsViewsNav({ path, view }: { path: string; view: ProductsView }) {
  const current = VIEWS.find((item) => item.view === view) ?? VIEWS[0];
  return (
    <>
      <h1 className="sr-only">{current.label}</h1>
      <nav aria-label="Vistas de productos" className="flex flex-wrap gap-x-6 border-b border-border">
        {VIEWS.map((item) => (
          <Link
            key={item.view}
            href={`${path}${item.query}`}
            aria-current={item.view === view ? "page" : undefined}
            className={cn(
              "-mb-px rounded-t-sm border-b-2 pb-2 text-2xl font-semibold tracking-tight transition-colors max-md:text-xl",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              item.view === view ? "border-primary text-text-primary" : "border-transparent text-text-secondary hover:text-text-primary"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
