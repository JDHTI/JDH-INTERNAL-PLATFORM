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
      // The main lists' board goes without a line: the table says what it is.
      description:
        kind === "principal"
          ? undefined
          : "Una lista de precios vigente de SIESA contra el costo de hoy, el margen objetivo, la última venta y los apoyos de sus clientes. Se envía completa a validación, como una cotización.",
    },
    {
      key: "por-cargar",
      label: "Por cargar",
      href: `${basePath}/por-cargar`,
      description:
        kind === "principal"
          ? "Los ítems validados que aún no se cargan en SIESA, por lista, con sus archivos y las últimas cargas."
          : "Las actualizaciones y las cotizaciones validadas que aún no se cargan en SIESA, con su Excel y su plano para marcarlas como cargadas.",
    },
  ];
  if (kind === "lista") {
    views.push({
      key: "cotizaciones",
      label: "Cotizaciones por validar",
      href: `${basePath}/cotizaciones`,
      description:
        "Las cotizaciones de cliente que piden actualizar o crear una lista: valídalas o devuélvelas con una nota, descarga sus archivos y márcalas como cargadas.",
    });
  }
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
