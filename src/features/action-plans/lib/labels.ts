import type { BadgeTone } from "@/shared/components/ui/badge";

import type { Method, Option, PlanCatalog } from "../types/action-plans.types";

/*
 * How each closed list reads. The API sends the labels in its catalog and those
 * win; these are what shows before the catalog arrives, so a row never renders a
 * raw code like «en_proceso».
 */

const FALLBACK = {
  origins: {
    AI: "Auditoría interna",
    AE: "Auditoría externa",
    AT: "Accidente de trabajo",
    IN: "Inspección",
    OM: "Oportunidad de mejora",
    PI: "Partes interesadas",
    SNC: "Salida no conforme",
  },
  action_types: { correctiva: "Correctiva", preventiva: "Preventiva", mejora: "Mejora" },
  ratings: { real: "Real", potencial: "Potencial", oportunidad_mejora: "Oportunidad de mejora" },
  methods: {
    "5m": "5M",
    espina_pescado: "Espina de pescado",
    lluvia_ideas: "Lluvia de ideas",
    sin_fallo: "No hay fallo en nuestro proceso / respuesta formal",
  },
  cause_categories: {
    mano_obra: "Mano de obra",
    metodos: "Métodos",
    maquinaria: "Maquinaria",
    materiales: "Materia prima",
    medio_ambiente: "Medio ambiente",
    medicion: "Medición",
    otra: "Otra",
  },
  effectiveness: { si: "Sí", no: "No", pendiente: "Pendiente" },
  statuses: { abierta: "Abierta", en_proceso: "En proceso", cerrada: "Cerrada" },
} as const;

type ListKey = keyof typeof FALLBACK;

export type Labels = Record<ListKey, (value: string | null | undefined) => string>;

function reader(list: ListKey, options: Option[] | undefined) {
  const fromApi = new Map((options ?? []).map((option) => [option.value, option.label]));
  const fallback = FALLBACK[list] as Record<string, string>;
  return (value: string | null | undefined) =>
    value ? (fromApi.get(value) ?? fallback[value] ?? value) : "";
}

export function makeLabels(catalog: PlanCatalog | undefined): Labels {
  return {
    origins: reader("origins", catalog?.origins),
    action_types: reader("action_types", catalog?.action_types),
    ratings: reader("ratings", catalog?.ratings),
    methods: reader("methods", catalog?.methods),
    cause_categories: reader("cause_categories", catalog?.cause_categories),
    effectiveness: reader("effectiveness", catalog?.effectiveness),
    statuses: reader("statuses", catalog?.statuses),
  };
}

export function statusTone(status: string): BadgeTone {
  if (status === "cerrada") return "success";
  if (status === "en_proceso") return "warning";
  return "neutral";
}

export function effectivenessTone(effectiveness: string): BadgeTone {
  if (effectiveness === "si") return "success";
  if (effectiveness === "no") return "danger";
  return "neutral";
}

/** The rating a type proposes: corrective is real, preventive potential, improvement an opportunity. */
export const RATING_FOR_TYPE: Record<string, "real" | "potencial" | "oportunidad_mejora"> = {
  correctiva: "real",
  preventiva: "potencial",
  mejora: "oportunidad_mejora",
};

/** Preventive and improvement actions carry no immediate correction; an improvement carries no analysis. */
export const hasCorrections = (actionType: string) => actionType === "correctiva";
export const hasAnalysis = (actionType: string) => actionType !== "mejora";

export const DEFAULT_METHODS: Method[] = ["5m", "espina_pescado", "lluvia_ideas", "sin_fallo"];
