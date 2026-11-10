import type { Carga } from "@/features/dwh-monitoring/types/dwh-monitoring.types";

/** Worst first: what a check, an application, the warehouse or the whole board says. */
export type Estado = "up" | "degraded" | "down";

export type Objetivo = "api" | "ui";

/** One request against the health endpoint or the UI. */
export interface Chequeo {
  objetivo: Objetivo;
  chequeado_en: string;
  estado: Estado;
  codigo_http: number | null;
  latencia_ms: number | null;
  error: string | null;
  /**
   * API: the health endpoint's JSON body. UI: `redirige_a` when the page
   * answered with a redirect (to the login, usually), which counts as up.
   */
  detalle: Record<string, unknown> | null;
}

/** The newest check of a target and its last 24 hours. */
export interface ObjetivoResumen {
  url: string;
  ultimo: Chequeo | null;
  /** Share of the last 24 h checks that did not come out `down`, 0 to 100. */
  disponibilidad_24h: number | null;
  chequeos_24h: number;
  latencia_media_24h_ms: number | null;
}

export interface Aplicativo {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string | null;
  /** The server only, e.g. https://intranet.jdh.com.co. */
  url_base: string;
  ruta_health: string;
  ruta_ui: string;
  verificar_ui: boolean;
  habilitado: boolean;
  verificar_tls: boolean;
  timeout_s: number;
  umbral_lento_ms: number;
  orden: number;
  creado_en: string | null;
  actualizado_en: string | null;
  /** The worse of API and UI; null when disabled or never checked. */
  estado: Estado | null;
  api: ObjetivoResumen | null;
  /** Null when `verificar_ui` is off. */
  ui: ObjetivoResumen | null;
}

export interface AplicativosOverview {
  total: number;
  /** The counts below cover enabled applications only. */
  habilitados: number;
  arriba: number;
  degradados: number;
  caidos: number;
  sin_datos: number;
  estado: Estado | null;
  ultimo_chequeo: string | null;
  chequeo_automatico: { habilitado: boolean; intervalo_s: number };
  aplicativos: Aplicativo[];
}

export interface DatawarehouseBoard {
  /**
   * `down`: the last load failed or no good load in 3 intervals. `degraded`:
   * late or never-extracted tables, a partial load, or a sequence whose last
   * run failed. Null before the first load.
   */
  estado: Estado | null;
  pct_fresca_programadas: number | null;
  atrasadas: number | null;
  nunca_extraidas: number | null;
  secuencias_activas: number;
  secuencias_en_curso: number;
  secuencias_fallidas: number;
  ultima_carga: Carga | null;
  ultima_carga_exitosa: string | null;
}

export interface Board {
  generado_en: string;
  estado_general: Estado | null;
  aplicativos: AplicativosOverview;
  datawarehouse: DatawarehouseBoard;
}

/** What the form sends. On PATCH only the changed fields go. */
export interface AplicativoInput {
  nombre: string;
  url_base: string;
  slug?: string;
  descripcion?: string | null;
  ruta_health?: string;
  ruta_ui?: string;
  verificar_ui?: boolean;
  habilitado?: boolean;
  verificar_tls?: boolean;
  timeout_s?: number;
  umbral_lento_ms?: number;
  orden?: number;
}

export interface ChecksParams {
  objetivo?: Objetivo;
  /** Bogotá days, "YYYY-MM-DD"; both left out, the API takes today. */
  desde?: string;
  hasta?: string;
  page: number;
  size: number;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}
