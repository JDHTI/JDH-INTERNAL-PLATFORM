import type { PageView } from "@/shared/components/page-header";

import type { ListKind } from "../types/quotations.types";

/**
 * The views of a list module, each at its own address: the updates, the
 * staging of what was validated and is not loaded yet, and in Listas
 * principales the liquor tax of every list.
 */
export function listModuleViews(kind: ListKind, basePath: string): PageView[] {
  const views: PageView[] = [
    {
      key: "actualizaciones",
      label: kind === "principal" ? "Listas" : "Actualizaciones",
      href: basePath,
      description:
        kind === "principal"
          ? "Las 14 listas generales, mayoristas y de Market en una sola tabla, contra el costo de hoy, el margen objetivo, la última venta y los apoyos de sus clientes. Filtra por lista cuando lo necesites; cada ítem se marca y se valida por separado."
          : "Una lista de precios vigente de SIESA contra el costo de hoy, el margen objetivo, la última venta y los apoyos de sus clientes. Cada ítem se marca y se valida por separado.",
    },
    {
      key: "por-cargar",
      label: "Por cargar",
      href: `${basePath}/por-cargar`,
      description: "Los ítems validados que aún no se cargan en SIESA, por lista, con sus archivos y las últimas cargas.",
    },
  ];
  if (kind === "principal") {
    views.push({
      key: "impuesto-licor",
      label: "Impuesto licor",
      href: `${basePath}/impuesto-licor`,
      description:
        "El impuesto licor de cada producto activo en todas las listas: qué valor lleva, dónde no cuadra y el cambio masivo con las dos hojas de SIESA.",
    });
  }
  return views;
}
