import type { CaseFilters, CaseSort, CaseSummary } from "../types/pqrsf.types";

/*
 * The inbox lives in the URL (?vista=vencidos&status_id=…&q=…) so a view can
 * be shared, bookmarked and recovered with the back button, the way a saved
 * filter in the old spreadsheet could not.
 */

export const INBOX_VIEWS = [
  "todos",
  "abiertos",
  "mios",
  "con-novedades",
  "sin-asignar",
  "vencidos",
  "vencen-hoy",
] as const;
export type InboxView = (typeof INBOX_VIEWS)[number];

export const PAGE_SIZES = [25, 50, 100] as const;
export const DEFAULT_SORT: CaseSort = "-received_on";

const SORTS: CaseSort[] = [
  "received_on",
  "-received_on",
  "due_on",
  "-due_on",
  "code",
  "-code",
  "updated_at",
  "-updated_at",
];

export interface InboxState {
  view?: InboxView;
  status_id: string[];
  request_type_id?: string;
  assignee_user_id?: string;
  dependency_id?: string;
  site_id?: string;
  received_from?: string;
  received_to?: string;
  q?: string;
  sort: CaseSort;
  page: number;
  size: number;
}

/** The refinements a person sets by hand, as opposed to the view and paging. */
export const REFINEMENT_KEYS = [
  "status_id",
  "request_type_id",
  "assignee_user_id",
  "dependency_id",
  "site_id",
  "received_from",
  "received_to",
  "q",
] as const;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function text(params: URLSearchParams, key: string): string | undefined {
  const value = params.get(key)?.trim();
  return value ? value : undefined;
}

function isoDate(params: URLSearchParams, key: string): string | undefined {
  const value = text(params, key);
  return value && ISO_DATE.test(value) ? value : undefined;
}

export function parseInboxState(params: URLSearchParams): InboxState {
  const view = text(params, "vista");
  const sort = text(params, "sort");
  const page = Number(params.get("page"));
  const size = Number(params.get("size"));
  return {
    view: INBOX_VIEWS.includes(view as InboxView) ? (view as InboxView) : undefined,
    status_id: params.getAll("status_id").filter(Boolean),
    request_type_id: text(params, "request_type_id"),
    assignee_user_id: text(params, "assignee_user_id"),
    dependency_id: text(params, "dependency_id"),
    site_id: text(params, "site_id"),
    received_from: isoDate(params, "received_from"),
    received_to: isoDate(params, "received_to"),
    q: text(params, "q"),
    sort: SORTS.includes(sort as CaseSort) ? (sort as CaseSort) : DEFAULT_SORT,
    page: Number.isInteger(page) && page > 0 ? page : 1,
    size: PAGE_SIZES.includes(size as (typeof PAGE_SIZES)[number]) ? size : PAGE_SIZES[0],
  };
}

/** Defaults stay out of the URL so the plain /pqrsf link is the default view. */
export function serializeInboxState(state: InboxState): string {
  const params = new URLSearchParams();
  if (state.view) params.set("vista", state.view);
  for (const id of state.status_id) params.append("status_id", id);
  for (const key of REFINEMENT_KEYS) {
    if (key === "status_id") continue;
    const value = state[key];
    if (value) params.set(key, value);
  }
  if (state.sort !== DEFAULT_SORT) params.set("sort", state.sort);
  if (state.page > 1) params.set("page", String(state.page));
  if (state.size !== PAGE_SIZES[0]) params.set("size", String(state.size));
  return params.toString();
}

/**
 * Everyone lands on «Todos», managers or not; a view in the URL wins. "Sin
 * asignar" is a manager's view: nobody else can act on an unassigned case.
 */
export function resolveView(view: InboxView | undefined, isManager: boolean): InboxView {
  if (view === "sin-asignar" && !isManager) return "todos";
  return view ?? "todos";
}

export function availableViews(isManager: boolean): InboxView[] {
  return isManager ? [...INBOX_VIEWS] : INBOX_VIEWS.filter((view) => view !== "sin-asignar");
}

export const VIEW_LABELS: Record<InboxView, string> = {
  mios: "Mis casos",
  "con-novedades": "Con novedades",
  "sin-asignar": "Sin asignar",
  vencidos: "Vencidos",
  "vencen-hoy": "Vencen hoy",
  abiertos: "Abiertos",
  todos: "Todos",
};

const VIEW_FILTERS: Record<InboxView, Partial<CaseFilters>> = {
  mios: { mine: true, open_only: true },
  "con-novedades": { with_news: true },
  "sin-asignar": { unassigned: true, open_only: true },
  vencidos: { overdue: true },
  "vencen-hoy": { due_today: true },
  abiertos: { open_only: true },
  todos: {},
};

export function toApiFilters(state: InboxState, view: InboxView, isManager: boolean): CaseFilters {
  return {
    ...VIEW_FILTERS[view],
    status_id: state.status_id,
    request_type_id: state.request_type_id,
    // Only managers can filter by someone else; the API would ignore it anyway.
    assignee_user_id: isManager ? state.assignee_user_id : undefined,
    dependency_id: state.dependency_id,
    site_id: state.site_id,
    received_from: state.received_from,
    received_to: state.received_to,
    q: state.q,
    sort: state.sort,
  };
}

/** Counter of each view, taken from the unfiltered summaries. */
export function viewCount(
  view: InboxView,
  all: CaseSummary | undefined,
  mine: CaseSummary | undefined
): number | undefined {
  switch (view) {
    case "mios":
      return mine?.open;
    case "con-novedades":
      return all?.with_news;
    case "sin-asignar":
      return all?.unassigned;
    case "vencidos":
      return all?.overdue;
    case "vencen-hoy":
      return all?.due_today;
    case "abiertos":
      return all?.open;
    case "todos":
      return all?.total;
  }
}

/*
 * The last inbox query of this tab, so "back to the inbox" from a case
 * returns to the same view, filters and page instead of the default.
 */
let lastInboxQuery = "";

export function rememberInboxQuery(query: string) {
  lastInboxQuery = query;
}

export function inboxHref(area: string): string {
  return lastInboxQuery ? `/${area}/pqrsf?${lastInboxQuery}` : `/${area}/pqrsf`;
}

export function hasRefinements(state: InboxState): boolean {
  return REFINEMENT_KEYS.some((key) =>
    key === "status_id" ? state.status_id.length > 0 : Boolean(state[key])
  );
}
