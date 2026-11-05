/*
 * Contract of /api/v1/salespeople (internal-platform-api docs/salespeople.md):
 * which SIESA salespeople and supervisors each platform user works as, and the
 * commercial scope that follows from it.
 */

/**
 * What a person sees of the customers, decided by the API. all: admins,
 * moderators, BI and the leader or responsible of Comercial. team: a linked
 * supervisor. mine: a linked salesperson. none: anyone else, members of
 * Comercial without a link included, until TI links them.
 */
export type SalesScope = "all" | "team" | "mine" | "none";

export type SalespersonKind = "seller" | "supervisor";

/** auto: matched by e-mail. manual: set by TI, wins over auto. excluded: unlinked, the e-mail never relinks it. */
export type LinkSource = "auto" | "manual" | "excluded";

export interface MySalesScope {
  scope: SalesScope;
  seller_codes: string[];
  supervisor_codes: string[];
  /** Salesperson codes whose customers the person works on; null is every customer. */
  codes: string[] | null;
}

export interface SalespersonLink {
  id: string;
  kind: SalespersonKind;
  code: string;
  source: LinkSource;
  created_at: string;
  updated_at: string;
}

export interface RosterEntry {
  kind: SalespersonKind;
  code: string;
  name: string | null;
  /** The e-mail SIESA has for the code; most have none. */
  email: string | null;
  supervisor_code: string | null;
  is_active: boolean;
  /** Who works as this code now, by hand or by e-mail; null when nobody. */
  holder_email: string | null;
  holder_name: string | null;
  link: SalespersonLink | null;
}

export interface RosterPage {
  items: RosterEntry[];
  total: number;
  page: number;
  size: number;
}

export interface RosterFilters {
  kind: SalespersonKind;
  q: string;
  /** undefined: everyone; false: only codes nobody holds. */
  linked: boolean | undefined;
  page: number;
}

export interface UserLinks {
  user: { id: string; email: string | null; display_name: string | null; is_active: boolean };
  links: SalespersonLink[];
}

export interface SyncResult {
  created: number;
  matched: number;
  without_user: number;
}

export const ROSTER_PAGE_SIZE = 50;

export const KIND_LABELS: Record<SalespersonKind, string> = {
  seller: "Vendedor",
  supervisor: "Supervisor",
};

export const SOURCE_LABELS: Record<LinkSource, string> = {
  auto: "Por correo",
  manual: "Manual",
  excluded: "Desvinculado",
};

/** The link that actually gives the code to someone; an excluded one does not. */
export function activeLink(entry: RosterEntry): SalespersonLink | null {
  return entry.link && entry.link.source !== "excluded" ? entry.link : null;
}
