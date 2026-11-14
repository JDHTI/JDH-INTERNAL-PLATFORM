import type { Feature, FeatureCollection, LineString, MultiPolygon, Point, Polygon } from "geojson";

/** The contract is internal-platform-api's docs/mapa-comercial.md, prefix /territory. */

export interface TerritoryPermissions {
  can_read: boolean;
  can_manage: boolean;
}

export type LocationQuality = "exact" | "approximate" | "manual" | "missing";
export type AreaStatus = "inside" | "outside" | "unlocated";
export type VisitStatus = "pending" | "visited" | "interested" | "discarded";

/** A key of the `--project-*` palette (DESIGN.md §3.8). */
export type PaletteKey =
  | "gray"
  | "brown"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "pink"
  | "red";

export interface ProspectFilters {
  q?: string;
  source_zone?: string;
  category?: string;
  /** Commercial zone. */
  zone_id?: string;
  former?: boolean;
  visit_status?: VisitStatus | "";
}

export interface ProspectListParams extends ProspectFilters {
  located?: boolean;
  page: number;
  size: number;
}

export interface ProspectMapProperties {
  id: string;
  external_id: string;
  name: string;
  category: string | null;
  source_zone: string;
  sector: string | null;
  is_former_customer: boolean;
  location_quality: LocationQuality;
  commercial_zone_id: string | null;
  visit_status: VisitStatus;
}

export type ProspectFeature = Feature<Point, ProspectMapProperties>;
export type ProspectCollection = FeatureCollection<Point, ProspectMapProperties>;

export interface ZoneRef {
  id: string;
  name: string;
  color: PaletteKey;
}

export interface ProspectSummary {
  id: string;
  external_id: string;
  name: string;
  category: string | null;
  source_zone: string;
  sector: string | null;
  address: string | null;
  is_former_customer: boolean;
  location_quality: LocationQuality;
  latitude: number | null;
  longitude: number | null;
  commercial_zone: ZoneRef | null;
  visit_status: VisitStatus;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

export interface FacetValue {
  value: string;
  count: number;
}

export interface ProspectFacets {
  source_zones: FacetValue[];
  categories: FacetValue[];
  total: number;
  located: number;
  unlocated: number;
}

export interface ProspectPhone {
  number: string;
  display: string;
  label: string | null;
  /** A Colombian mobile: the card offers WhatsApp. */
  is_mobile: boolean;
}

export interface ProspectDetail {
  id: string;
  external_id: string;
  name: string;
  category: string | null;
  source_zone: string;
  sector: string | null;
  address: string | null;
  area_status: AreaStatus | null;
  is_former_customer: boolean;
  /** `YYYY-MM-01`. */
  last_purchase_month: string | null;
  phones: ProspectPhone[];
  emails: string[];
  website: string | null;
  observation: string | null;
  contact_raw: { phone: string | null; email: string | null } | null;
  latitude: number | null;
  longitude: number | null;
  location_quality: LocationQuality;
  commercial_zone: ZoneRef | null;
  visit_status: VisitStatus;
  visit_note: string | null;
  visited_at: string | null;
  load_id: string | null;
  created_at: string;
  updated_at: string;
}

/** Latitude and longitude travel together. */
export interface ProspectPatch {
  latitude?: number;
  longitude?: number;
  visit_status?: VisitStatus;
  visit_note?: string | null;
}

export interface ImportSheet {
  name: string;
  rows: number;
  with_location: number;
  without_location: number;
}

export interface ImportError {
  sheet: string | null;
  row_number: number | null;
  field: string | null;
  message: string;
}

export interface ImportReport {
  applied: boolean;
  blocked: boolean;
  load_id: string | null;
  rows_read: number;
  with_location: number;
  without_location: number;
  approximate: number;
  to_create: number;
  to_update: number;
  unchanged: number;
  sheets: ImportSheet[];
  errors: ImportError[];
  errors_truncated: boolean;
}

export interface ProspectLoad {
  id: string;
  file_name: string;
  rows_read: number;
  created: number;
  updated: number;
  unchanged: number;
  loaded_by: string | null;
  loaded_at: string;
}

export type ZoneLayer = "official" | "commercial";
export type ZoneLevel = "department" | "municipality" | "commune" | "neighborhood" | "custom";

export interface ZoneProperties {
  id: string;
  layer: ZoneLayer;
  level: ZoneLevel;
  name: string;
  code: string | null;
  parent_id: string | null;
  color: PaletteKey | null;
  source: string | null;
  prospect_count: number;
}

export type ZoneGeometry = Polygon | MultiPolygon;
export type ZoneFeature = Feature<ZoneGeometry, ZoneProperties>;
export type ZoneCollection = FeatureCollection<ZoneGeometry, ZoneProperties>;

export interface ZoneInput {
  name: string;
  color: PaletteKey;
  geometry: ZoneGeometry;
}

export interface ZoneAdoptInput {
  name: string;
  color: PaletteKey;
  official_zone_ids: string[];
}

export type RouteGeometryStatus = "road" | "straight" | "pending";

export interface RoutePerson {
  id: string;
  email: string | null;
  display_name: string | null;
}

export interface RouteOrigin {
  latitude: number;
  longitude: number;
  label: string | null;
}

export interface RouteSummary {
  id: string;
  name: string;
  /** `YYYY-MM-DD`. */
  planned_for: string | null;
  assignee: RoutePerson | null;
  stop_count: number;
  visited_count: number;
  distance_m: number | null;
  /** null on a straight-line route: there is no road time to give. */
  duration_s: number | null;
  geometry_status: RouteGeometryStatus;
  created_by: RoutePerson | null;
  created_at: string;
  updated_at: string;
}

export interface RouteStop {
  id: string;
  /** Starts at 1. */
  position: number;
  prospect_id: string | null;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  visit_status: VisitStatus;
  visit_note: string | null;
  visited_at: string | null;
  /** The leg that arrives at this stop; null on the first stop of a route with no origin. */
  leg_distance_m: number | null;
  leg_duration_s: number | null;
}

export interface RouteDetail extends RouteSummary {
  origin: RouteOrigin | null;
  geometry: LineString | null;
  /** Why the route does not follow the streets, when it does not. */
  routing_note: string | null;
  stops: RouteStop[];
}

export interface RouteCreateInput {
  name: string;
  planned_for?: string | null;
  assignee_email?: string | null;
  origin?: RouteOrigin | null;
  prospect_ids: string[];
  optimize: boolean;
}

/** Only what is sent changes; null clears the date, the assignee or the origin. */
export interface RouteUpdateInput {
  name?: string;
  planned_for?: string | null;
  assignee_email?: string | null;
  origin?: RouteOrigin | null;
  prospect_ids?: string[];
}

export interface StopPatch {
  visit_status?: VisitStatus;
  visit_note?: string | null;
}
