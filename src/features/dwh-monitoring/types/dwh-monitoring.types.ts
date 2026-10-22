/*
 * Shapes of /dwh-monitoring, field by field from the API's response models.
 * Names are the Spanish ones of the DWH's `monitoreo` contract. Instants are
 * ISO 8601 with zone; `hora_*` fields are "HH:MM:SS" already in Bogotá time;
 * intervals arrive in seconds with an `_s` suffix; percentages go 0 to 100.
 */

export type EstadoFrescura = "Fresca" | "Atrasada" | "Nunca extraída" | "Deshabilitada";
export type Programacion = "Secuencia" | "Sin programación";
export type EstadoCorrida = "running" | "success" | "failed" | "abandonada";
export type EstadoRun = "running" | "success" | "failed" | "orphaned";
export type Disparo = "scheduled" | "manual" | "backfill";
export type EstadoCarga = "success" | "partial" | "failed";

export interface Secuencia {
  secuencia: string;
  descripcion: string | null;
  /** Activa, Inactiva, Retirada or "Sin dato de systemd". */
  estado_programacion: string | null;
  /** systemd OnCalendar, e.g. "*-*-* 03:00". */
  calendario: string | null;
  hora_inicio: string | null;
  tope_s: number | null;
  tablas_fase1: number | null;
  tablas_fase2: number | null;
  transformacion: string | null;
  ultima_corrida_id: string | null;
  ultima_estado: string | null;
  ultima_inicio: string | null;
  ultima_datos_listos: string | null;
  ultima_fin: string | null;
  ultima_duracion_s: number | null;
  en_curso: boolean | null;
  eta_datos_listos_en_curso: string | null;
  eta_fin_en_curso: string | null;
  proxima_ejecucion: string | null;
  eta_datos_listos_proxima: string | null;
  eta_fin_proxima: string | null;
  hora_tipica_datos_listos: string | null;
  extraccion_mediana_min: number | null;
  transformacion_mediana_min: number | null;
  datos_listos_mediana_min: number | null;
  datos_listos_p90_min: number | null;
  duracion_mediana_min: number | null;
  pct_exito: number | null;
  corridas_medidas: number | null;
  systemd_proximo: string | null;
  systemd_ultimo: string | null;
  sincronizado_en: string | null;
  cargado_en: string;
}

export interface SecuenciaTabla {
  secuencia: string;
  fase: number;
  carril: number | null;
  orden: number | null;
  dominio: string | null;
  alcance: string | null;
  tabla: string | null;
  pipeline_name: string;
  estrategia: string | null;
  habilitada: boolean | null;
  ultima_extraccion_ok: string | null;
  ultimo_estado: string | null;
  ultimo_inicio: string | null;
  ultimo_fin: string | null;
  ultimo_filas: number | null;
  ultimo_error: string | null;
}

export interface HorarioTipico {
  secuencia: string;
  calendario: string;
  dias_semana: number[] | null;
  hora_programada: string | null;
  hora_inicio_real: string | null;
  hora_fin_extraccion: string | null;
  hora_datos_listos: string | null;
  hora_datos_listos_p90: string | null;
  hora_fin: string | null;
  corridas_medidas: number | null;
}

export interface Estadistica {
  secuencia: string;
  corridas_medidas: number | null;
  extraccion_mediana_s: number | null;
  transformacion_mediana_s: number | null;
  datos_listos_mediana_s: number | null;
  datos_listos_p90_s: number | null;
  duracion_mediana_s: number | null;
  duracion_p90_s: number | null;
  retraso_inicio_mediana_s: number | null;
  extraccion_fin_desde_programada_s: number | null;
  datos_listos_desde_programada_s: number | null;
  datos_listos_p90_desde_programada_s: number | null;
  fin_desde_programada_s: number | null;
  pct_exito: number | null;
}

export interface SecuenciaDetalle extends Secuencia {
  tablas: SecuenciaTabla[];
  horario: HorarioTipico[];
  estadisticas: Estadistica | null;
}

export interface FrescuraResumen {
  calculado_en: string;
  tablas_habilitadas: number | null;
  tablas_deshabilitadas: number | null;
  tablas_programadas: number | null;
  frescas_programadas: number | null;
  pct_fresca_programadas: number | null;
  frescas_total: number | null;
  pct_fresca_total: number | null;
  atrasadas: number | null;
  nunca_extraidas: number | null;
  ultima_extraccion_ok: string | null;
}

export interface FrescuraDominio {
  dominio: string;
  tablas: number | null;
  frescas: number | null;
  atrasadas: number | null;
  nunca_extraidas: number | null;
  programadas: number | null;
  pct_fresca: number | null;
  ultima_extraccion_ok: string | null;
}

export interface Frescura {
  resumen: FrescuraResumen | null;
  dominios: FrescuraDominio[];
}

export interface FrescuraTabla {
  dominio: string | null;
  tabla: string | null;
  pipeline_name: string;
  estrategia: string | null;
  programacion: string | null;
  /** The sequences that extract it, as one comma-separated text. */
  secuencias: string | null;
  /** The table's last successful extraction: its last modification. */
  ultima_extraccion_ok: string | null;
  edad_s: number | null;
  edad_horas: number | null;
  max_staleness_s: number | null;
  ultima_pasada_secuencia: string | null;
  estado_frescura: string | null;
  motivo_deshabilitada: string | null;
}

export interface Corrida {
  corrida_id: string;
  secuencia: string;
  origen: string | null;
  estado: string | null;
  programada: string | null;
  fuera_de_horario: boolean | null;
  inicio: string;
  extraccion_fin: string | null;
  transformacion_inicio: string | null;
  transformacion_fin: string | null;
  datos_listos: string | null;
  fase2_inicio: string | null;
  fase2_fin: string | null;
  fin: string | null;
  extraccion_s: number | null;
  transformacion_s: number | null;
  hasta_datos_listos_s: number | null;
  duracion_s: number | null;
  retraso_inicio_s: number | null;
  extraccion_fin_desde_programada_s: number | null;
  datos_listos_desde_programada_s: number | null;
  fin_desde_programada_s: number | null;
  extracciones: number | null;
  extracciones_fallidas: number | null;
  filas_extraidas: number | null;
  transformaciones_fallidas: number | null;
  codigo_salida: number | null;
  os_hostname: string | null;
  os_pid: number | null;
}

export interface Extraccion {
  run_id: string;
  inicio: string;
  fin: string | null;
  duracion_s: number | null;
  estado: string | null;
  disparo: string | null;
  secuencia: string | null;
  corrida_id: string | null;
  dominio: string | null;
  tabla: string | null;
  pipeline_name: string | null;
  estrategia: string | null;
  filas_extraidas: number | null;
  filas_cargadas: number | null;
  filas_origen: number | null;
  filas_esperadas: number | null;
  /** Cuadra, Diferencia or "No aplica". */
  conciliacion: string | null;
  paginas: number | null;
  /** The incremental window, as the JSON the DWH stores. */
  ventana_desde: unknown;
  ventana_hasta: unknown;
  batch_id: string | null;
  error: string | null;
  cancelada_por: string | null;
  os_hostname: string | null;
  os_pid: number | null;
}

export interface VistaCarga {
  leidas: number;
  escritas: number;
  error: string | null;
}

export interface Carga {
  id: string;
  iniciado_en: string;
  terminado_en: string | null;
  estado: EstadoCarga | null;
  error: string | null;
  detalle: Record<string, VistaCarga>;
}

export interface EstadoCargaDwh {
  habilitada: boolean;
  intervalo_s: number;
  ultima: Carga | null;
  ultima_exitosa: string | null;
}

export interface DatosListos {
  secuencia: string;
  ultima_estado: string | null;
  /** Today's ready time, or null when the data is not ready yet today. */
  datos_listos: string | null;
  eta_datos_listos: string | null;
  hora_tipica_datos_listos: string | null;
  corridas_medidas: number | null;
}

export interface Overview {
  zona_horaria: string;
  frescura: FrescuraResumen | null;
  secuencias_activas: number;
  secuencias_en_curso: number;
  datos_listos_hoy: DatosListos[];
  carga: EstadoCargaDwh;
}

export interface Horario {
  fecha: string;
  zona_horaria: string;
  tipico: HorarioTipico[];
  corridas: Corrida[];
  secuencias: Secuencia[];
}

export interface Items<T> {
  items: T[];
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

export interface FreshnessTableParams {
  estado: EstadoFrescura[];
  dominio?: string;
  programacion?: Programacion;
  q?: string;
}

export interface ExtractionParams {
  desde?: string;
  hasta?: string;
  secuencia?: string;
  dominio?: string;
  estado: EstadoRun[];
  disparo?: Disparo;
  q?: string;
  page: number;
  size: number;
}
