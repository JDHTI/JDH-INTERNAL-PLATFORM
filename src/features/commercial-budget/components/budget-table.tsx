"use client";

import { Fragment, useState } from "react";
import { ChevronDown, History, Users } from "lucide-react";

import StatePanel from "@/shared/components/state-panel";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import { useUpdateBudgets } from "../hooks/use-commercial-budget";
import {
  formatChange,
  formatCount,
  formatPercent,
  formatPesos,
  marginInput,
  parseMarginPoints,
  parsePesos,
  parseWhole,
  shortPeriod,
  wholeInput,
  windowLabel,
} from "../lib/format";
import {
  NO_REP,
  type BudgetBoard,
  type BudgetField,
  type Figures,
  type GroupTotals,
  type Period,
  type RepRow,
  type Totals,
} from "../types/commercial-budget.types";
import BudgetHistoryDialog from "./budget-history-dialog";

const NONE = "__none__";
const keyOf = (value: string | null) => value ?? NONE;

const th = "px-2 py-1.5 font-semibold";
const num = "whitespace-nowrap px-2 py-1 text-right tabular-nums";
/** The first cell of every column group draws the line that separates it from the one before. */
const groupStart = "border-l border-border";

const FIELD_LABELS: Record<BudgetField, string> = {
  budget_sales: "Presupuesto de venta",
  budget_margin: "Presupuesto de margen",
  budget_customers: "Presupuesto de clientes",
  budget_collection: "Presupuesto de recaudo",
};

/** The cells of one cut: sale, margin and customers. */
function FigureCells({ figures, first = false }: { figures: Figures; first?: boolean }) {
  return (
    <>
      <td className={cn(num, first && groupStart)}>{formatPesos(figures.net)}</td>
      <td className={num}>{formatPercent(figures.margin)}</td>
      <td className={num}>{formatCount(figures.customers)}</td>
    </>
  );
}

/** A subtotal (regional, team) or the total: the same columns, read-only. */
function TotalCells({ totals }: { totals: Totals }) {
  return (
    <>
      <FigureCells figures={totals.last_year} first />
      <FigureCells figures={totals.average} first />
      <FigureCells figures={totals.current} first />
      <td className={cn(num, groupStart)}>{formatPesos(totals.budget_sales)}</td>
      <td className={num}>{formatPercent(totals.budget_margin)}</td>
      <td className={num}>{formatCount(totals.budget_customers)}</td>
      <td className={num}>{formatPesos(totals.budget_collection)}</td>
      <td className={cn(num, groupStart)}>{formatChange(totals.derived.variation)}</td>
      <td className={num}>{formatPercent(totals.derived.compliance)}</td>
    </>
  );
}

interface TeamNode {
  key: string;
  label: string;
  totals: Totals | undefined;
  rows: RepRow[];
}

interface RegionalNode {
  key: string;
  label: string;
  totals: GroupTotals | undefined;
  teams: TeamNode[];
}

const pairKey = (regional: string | null, team: string | null) => `${keyOf(regional)}|${keyOf(team)}`;

/**
 * Regional → team → rep. The regional subtotals come from `groups.regional`; a team's from
 * `team_groups`, one per (regional, team): a team name can repeat in two regionals, and
 * `groups.team` would add both up. Regionals and teams follow the API's order.
 */
function buildTree(board: BudgetBoard): RegionalNode[] {
  const regionalTotals = new Map((board.groups.regional ?? []).map((group) => [keyOf(group.key), group]));
  const teamGroups = board.team_groups ?? [];
  const teamTotals = new Map(teamGroups.map((group) => [pairKey(group.regional, group.team), group]));
  const teamOrder = teamGroups.map((group) => pairKey(group.regional, group.team));
  const regionals = new Map<string, RegionalNode>();
  for (const row of board.rows) {
    const regionalKey = keyOf(row.regional);
    let regional = regionals.get(regionalKey);
    if (!regional) {
      regional = { key: regionalKey, label: row.regional ?? "Sin regional", totals: regionalTotals.get(regionalKey), teams: [] };
      regionals.set(regionalKey, regional);
    }
    const teamKey = keyOf(row.team);
    let team = regional.teams.find((item) => item.key === teamKey);
    if (!team) {
      team = { key: teamKey, label: row.team ?? "Sin equipo", totals: teamTotals.get(pairKey(row.regional, row.team)), rows: [] };
      regional.teams.push(team);
    }
    team.rows.push(row);
  }
  const order = (board.groups.regional ?? []).map((group) => keyOf(group.key));
  const tree = [...regionals.values()].sort((a, b) => rank(order, a.key) - rank(order, b.key));
  for (const regional of tree) {
    regional.teams.sort((a, b) => rank(teamOrder, `${regional.key}|${a.key}`) - rank(teamOrder, `${regional.key}|${b.key}`));
  }
  return tree;
}

const rank = (order: string[], key: string) => {
  const index = order.indexOf(key);
  return index === -1 ? order.length : index;
};

/** Folded groups; everything starts open. */
function useFoldedSet() {
  const [folded, setFolded] = useState<Set<string>>(new Set());
  const toggle = (key: string) =>
    setFolded((current) => {
      const next = new Set(current);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  return { folded, toggle };
}

/**
 * The month by rep, grouped regional → team, each group with its subtotal and the company total
 * at the bottom. Four column groups: the same month last year, the average of the three before,
 * the month, and the budget (editable for whoever fills it while the month is open); then the
 * variation against last year and the compliance. The rep column stays pinned when it scrolls.
 */
export default function BudgetTable({ board, editable }: { board: BudgetBoard; editable: boolean }) {
  const { folded, toggle } = useFoldedSet();
  const [history, setHistory] = useState<RepRow | null>(null);
  const period = board.period.period;

  if (board.rows.length === 0) {
    return (
      <StatePanel icon={Users} title="Ningún vendedor con estos filtros">
        Quita algún filtro o cambia la búsqueda.
      </StatePanel>
    );
  }

  const tree = buildTree(board);
  const averageLabel = `Promedio ${windowLabel(board.window.previous)}`;
  const pinned = "sticky left-0 z-[1]";

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full min-w-[86rem] text-left text-[13px]">
          <caption className="sr-only">Presupuesto comercial de {period} por regional, equipo y vendedor</caption>
          <thead className="bg-canvas-subtle text-[11px] uppercase tracking-[0.06em] text-text-secondary">
            <tr>
              <th scope="col" rowSpan={2} className={cn(th, pinned, "w-64 border-r border-border bg-canvas-subtle align-bottom")}>
                Vendedor
              </th>
              <th scope="colgroup" colSpan={3} className={cn(th, groupStart, "text-center")}>
                {shortPeriod(board.window.last_year)}
              </th>
              <th scope="colgroup" colSpan={3} className={cn(th, groupStart, "text-center")}>
                {averageLabel}
              </th>
              <th scope="colgroup" colSpan={3} className={cn(th, groupStart, "text-center")}>
                {shortPeriod(board.window.current)}
              </th>
              <th scope="colgroup" colSpan={4} className={cn(th, groupStart, "text-center")}>
                Ppto
              </th>
              <th scope="col" rowSpan={2} className={cn(th, groupStart, "text-right align-bottom")} title="Presupuesto de venta contra la venta del mismo mes del año anterior">
                % var. LY
              </th>
              <th scope="col" rowSpan={2} className={cn(th, "text-right align-bottom")} title="Venta del mes contra su presupuesto">
                % cumpl.
              </th>
            </tr>
            <tr>
              {[0, 1, 2].map((group) => (
                <SubHeaders key={group} labels={["Venta", "Margen", "Clientes"]} />
              ))}
              <SubHeaders labels={["Venta", "% margen", "# clientes", "Recaudo"]} />
            </tr>
          </thead>
          {tree.map((regional) => {
            const regionalOpen = !folded.has(`r:${regional.key}`);
            return (
              <tbody key={regional.key} className="border-t border-border">
                <GroupRow
                  level="regional"
                  label={regional.label}
                  totals={regional.totals}
                  open={regionalOpen}
                  onToggle={() => toggle(`r:${regional.key}`)}
                  count={regional.teams.reduce((sum, team) => sum + team.rows.length, 0)}
                />
                {regionalOpen &&
                  regional.teams.map((team) => {
                    const teamFold = `t:${regional.key}|${team.key}`;
                    const teamOpen = !folded.has(teamFold);
                    return (
                      <Fragment key={teamFold}>
                        <GroupRow
                          level="team"
                          label={team.label}
                          totals={team.totals}
                          open={teamOpen}
                          onToggle={() => toggle(teamFold)}
                          count={team.rows.length}
                        />
                        {teamOpen &&
                          team.rows.map((row) => (
                            <RepRowView
                              key={row.salesperson_code}
                              row={row}
                              period={period}
                              editable={editable && row.salesperson_code !== NO_REP}
                              onHistory={() => setHistory(row)}
                            />
                          ))}
                      </Fragment>
                    );
                  })}
              </tbody>
            );
          })}
          <tfoot className="border-t-2 border-border-control bg-canvas-subtle font-semibold">
            <tr>
              <th scope="row" className={cn("px-2 py-1.5 text-left", pinned, "border-r border-border bg-canvas-subtle")}>
                Total · {formatCount(board.totals.rows)} vendedores
              </th>
              <TotalCells totals={board.totals} />
            </tr>
          </tfoot>
        </table>
      </div>
      <BudgetHistoryDialog period={period} rep={history} onClose={() => setHistory(null)} />
    </>
  );
}

function SubHeaders({ labels }: { labels: string[] }) {
  return (
    <>
      {labels.map((label, index) => (
        <th key={label} scope="col" className={cn(th, "text-right", index === 0 && groupStart)}>
          {label}
        </th>
      ))}
    </>
  );
}

function GroupRow({
  level,
  label,
  totals,
  open,
  onToggle,
  count,
}: {
  level: "regional" | "team";
  label: string;
  totals: Totals | undefined;
  open: boolean;
  onToggle: () => void;
  count: number;
}) {
  const regional = level === "regional";
  return (
    <tr className={cn(regional ? "bg-canvas-subtle font-semibold" : "font-medium", "border-t border-border")}>
      <th scope="rowgroup" className={cn("sticky left-0 z-[1] border-r border-border px-2 py-1.5 text-left", regional ? "bg-canvas-subtle" : "bg-surface")}>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className={cn(
            "flex w-full min-w-0 items-center gap-1 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:min-h-11",
            !regional && "pl-4"
          )}
        >
          <ChevronDown className={cn("size-4 shrink-0 text-text-secondary transition-transform duration-150", !open && "-rotate-90")} aria-hidden="true" />
          <span className="min-w-0 truncate" title={label}>{label}</span>
          <span className="shrink-0 text-xs font-normal text-text-secondary tabular-nums">· {formatCount(count)}</span>
        </button>
      </th>
      {totals ? <TotalCells totals={totals} /> : <td colSpan={15} />}
    </tr>
  );
}

function RepRowView({ row, period, editable, onHistory }: { row: RepRow; period: Period; editable: boolean; onHistory: () => void }) {
  const name = row.name ?? row.salesperson_code;
  const noRep = row.salesperson_code === NO_REP;
  const months = row.average.months;
  return (
    <tr className="group border-t border-border hover:bg-primary-subtle">
      <th scope="row" className="sticky left-0 z-[1] border-r border-border bg-surface px-2 py-1 pl-9 text-left font-normal group-hover:bg-[image:linear-gradient(var(--primary-subtle),var(--primary-subtle))]">
        <div className="flex min-w-0 items-center gap-1.5">
          <div className="min-w-0 flex-1">
            <span className="block truncate font-medium" title={name}>{name}</span>
            <span className="flex items-center gap-1.5 text-xs text-text-secondary">
              {!noRep && <span className="font-mono">{row.salesperson_code}</span>}
              {!row.is_active && (
                <Badge tone="neutral" className="px-1 py-0 text-[11px]">
                  Inactivo
                </Badge>
              )}
            </span>
          </div>
          {!noRep && (
            <button
              type="button"
              onClick={onHistory}
              aria-label={`Historial del presupuesto de ${name}`}
              title="Historial del presupuesto"
              className="flex size-7 shrink-0 items-center justify-center rounded-sm text-text-secondary hover:bg-canvas-subtle hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring max-md:size-11"
            >
              <History className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </th>
      <FigureCells figures={row.last_year} first />
      <td className={cn(num, groupStart)} title={months ? `Promedio de ${months} ${months === 1 ? "mes" : "meses"} con venta` : undefined}>
        {formatPesos(row.average.net)}
      </td>
      <td className={num}>{formatPercent(row.average.margin)}</td>
      <td className={num}>{formatCount(row.average.customers)}</td>
      <FigureCells figures={row.current} first />
      {(["budget_sales", "budget_margin", "budget_customers", "budget_collection"] as const).map((field, index) => (
        <td key={field} className={cn("px-1.5 py-1 text-right", index === 0 && groupStart)}>
          <BudgetCell period={period} row={row} field={field} editable={editable} />
        </td>
      ))}
      <td className={cn(num, groupStart)}>{formatChange(row.derived.variation)}</td>
      <td className={num}>{formatPercent(row.derived.compliance)}</td>
    </tr>
  );
}

const PARSE_ERROR: Record<BudgetField, string> = {
  budget_sales: "Escribe la venta en pesos enteros, sin decimales.",
  budget_margin: "Escribe el margen en puntos, entre −100 y 100: 18 o 18,5.",
  budget_customers: "Escribe los clientes en números enteros.",
  budget_collection: "Escribe el recaudo en pesos enteros, sin decimales.",
};

function parseField(field: BudgetField, text: string): string | number | null | undefined {
  if (field === "budget_margin") return parseMarginPoints(text);
  if (field === "budget_customers") return parseWhole(text);
  return parsePesos(text);
}

function shownValue(field: BudgetField, row: RepRow): string {
  const value = row.budget?.[field] ?? null;
  if (field === "budget_margin") return formatPercent(value as string | null);
  if (field === "budget_customers") return formatCount(value as number | null);
  return formatPesos(value as string | null);
}

/**
 * One budget field of one rep, saved when the field is left or with Enter; empty clears it and
 * Escape puts the saved value back. Only that field goes, with the version read, so two people
 * filling different fields of the same rep do not overwrite each other; a 409 reloads the month.
 */
function BudgetCell({ period, row, field, editable }: { period: Period; row: RepRow; field: BudgetField; editable: boolean }) {
  const save = useUpdateBudgets(period);
  const value = row.budget?.[field] ?? null;
  const stored = field === "budget_margin" ? marginInput(value as string | null) : wholeInput(value);
  const [text, setText] = useState(stored);
  const [synced, setSynced] = useState(stored);
  const [error, setError] = useState<string | null>(null);
  if (stored !== synced) {
    // The budget changed on the server (a workbook, another person): show its value.
    setSynced(stored);
    setText(stored);
  }

  if (!editable) return <span className="whitespace-nowrap px-0.5 tabular-nums">{shownValue(field, row)}</span>;

  const name = row.name ?? row.salesperson_code;
  const commit = () => {
    if (text.trim() === stored) {
      setError(null);
      return;
    }
    const parsed = parseField(field, text);
    if (parsed === undefined) {
      setError(PARSE_ERROR[field]);
      return;
    }
    setError(null);
    save.mutate(
      { items: [{ salesperson_code: row.salesperson_code, ...(row.budget ? { version: row.budget.version } : {}), [field]: parsed }] },
      { onError: (failure) => setError(errorMessage(failure)) }
    );
  };

  return (
    <div className="space-y-0.5">
      <div className="relative">
        <Input
          inputMode={field === "budget_margin" ? "decimal" : "numeric"}
          autoComplete="off"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit();
            } else if (event.key === "Escape") {
              event.preventDefault();
              setText(stored);
              setError(null);
            }
          }}
          disabled={save.isPending}
          placeholder="—"
          aria-label={`${FIELD_LABELS[field]} de ${name}${field === "budget_margin" ? ", en puntos" : ""}`}
          aria-invalid={error ? true : undefined}
          title={error ?? undefined}
          className={cn(
            "h-7 w-full bg-surface text-right text-[13px] tabular-nums max-md:h-11",
            field === "budget_margin" ? "min-w-16 pr-5" : field === "budget_customers" ? "min-w-14" : "min-w-28",
            error && "border-danger"
          )}
        />
        {field === "budget_margin" && (
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-text-secondary" aria-hidden="true">
            %
          </span>
        )}
      </div>
      {error && (
        <span role="alert" className="block max-w-40 text-left text-xs leading-tight text-danger">
          {error}
        </span>
      )}
    </div>
  );
}
