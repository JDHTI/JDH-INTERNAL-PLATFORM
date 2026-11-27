"use client";

import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/lib/utils";

import { formatCount } from "../lib/format";
import type { VendorChange, VendorField, VendorPreview, VendorProblem } from "../types/commercial-budget.types";

/**
 * A rejected row whose team is not in the team master: the API refuses the whole upload while
 * there is one (API #145), so the button waits for a clean simulation.
 */
export const blocksUpload = (problem: VendorProblem) => problem.reason.includes("maestro de equipos");

const FIELD_ORDER: VendorField[] = ["team", "team_class", "regional", "business_unit"];

const th = "px-3 py-1.5";
const td = "px-3 py-1.5";

/**
 * What uploading the file would change, from POST /vendor-master/preview; nothing is written.
 * The counts, the rows the loader rejects (those outside the team master block the upload), each
 * field's changes as «antes → después», the teams created or emptied, the reps with sales the
 * file leaves out, the coordinators whose link breaks and the warnings.
 */
export default function VendorPreviewReport({ preview }: { preview: VendorPreview }) {
  const blocking = preview.rejected.filter(blocksUpload);
  const byField = FIELD_ORDER.map((field) => ({ field, items: preview.changes.filter((change) => change.field === field) })).filter(
    (group) => group.items.length > 0
  );
  const movedTeams = preview.teams.filter((team) => team.current !== team.new);

  return (
    <section aria-label="Simulación de la carga" aria-live="polite" className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold">Simulación: aún no se escribió nada</h3>
        <Badge tone="info">Simulación</Badge>
        {blocking.length > 0 ? (
          <Badge tone="danger">{formatCount(blocking.length)} filas bloquean la carga</Badge>
        ) : (
          <Badge tone="success">Se puede cargar</Badge>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Count label="Vendedores leídos" value={preview.reps_read} />
        <Count label="Encontrados en el ERP" value={preview.reps_resolved} />
        <Count label="Cambian" value={preview.changed_reps} />
        <Count label="Sin cambios" value={preview.unchanged} />
      </dl>

      {preview.rejected.length > 0 && (
        <Block title={`Filas rechazadas (${preview.rejected.length}): no se cargan`} danger>
          {blocking.length > 0 && (
            <p role="alert" className="rounded-md bg-danger-surface px-3 py-2 text-[13px] text-danger">
              {formatCount(blocking.length)} {blocking.length === 1 ? "fila tiene" : "filas tienen"} un equipo que no está en el maestro, y eso bloquea toda la
              carga. Escoge el equipo de la lista de la plantilla, o créalo en la pestaña «Equipos», y vuelve a simular.
            </p>
          )}
          <ProblemTable items={preview.rejected} danger />
        </Block>
      )}

      {byField.map((group) => (
        <Block key={group.field} title={`${group.items[0].field_label} (${group.items.length})`}>
          <ChangeTable items={group.items} />
        </Block>
      ))}

      {(preview.new_teams.length > 0 || preview.emptied_teams.length > 0 || movedTeams.length > 0) && (
        <Block title="Equipos">
          <div className="grid gap-3 sm:grid-cols-2">
            {preview.new_teams.length > 0 && <TeamList title="Reciben vendedores por primera vez" teams={preview.new_teams} />}
            {preview.emptied_teams.length > 0 && <TeamList title="Quedan sin vendedores" teams={preview.emptied_teams} />}
          </div>
          {movedTeams.length > 0 && (
            <Scroll>
              <table className="w-full text-left text-[13px]">
                <thead className={HEAD}>
                  <tr>
                    <th scope="col" className={th}>Equipo</th>
                    <th scope="col" className={cn(th, "text-right")}>Vendedores hoy → después</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {movedTeams.map((team) => (
                    <tr key={team.team}>
                      <td className={td}>{team.team}</td>
                      <td className={cn(td, "text-right tabular-nums")}>
                        {formatCount(team.current)} → {formatCount(team.new)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Scroll>
          )}
        </Block>
      )}

      {preview.missing.length > 0 && (
        <Block title={`Vendedores con ventas que no vienen en el archivo (${preview.missing.length})`}>
          <p className="text-[13px] text-text-secondary">Tienen ventas este mes o el anterior. Si no vienen, conservan el equipo que tienen hoy.</p>
          <Scroll>
            <table className="w-full text-left text-[13px]">
              <thead className={HEAD}>
                <tr>
                  <th scope="col" className={th}>Vendedor</th>
                  <th scope="col" className={th}>Equipo hoy</th>
                  <th scope="col" className={cn(th, "text-right")}>Líneas de venta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {preview.missing.map((rep) => (
                  <tr key={rep.salesperson_code}>
                    <td className={td}>
                      {rep.name ?? "—"} <span className="font-mono text-xs text-text-secondary">{rep.salesperson_code}</span>
                    </td>
                    <td className={td}>{rep.team ?? "—"}</td>
                    <td className={cn(td, "text-right tabular-nums")}>{formatCount(rep.lines)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Scroll>
        </Block>
      )}

      {preview.coordinators.length > 0 && (
        <Block title={`Coordinadores (${preview.coordinators.length})`}>
          <p className="text-[13px] text-text-secondary">Su equipo no es el de ningún vendedor del archivo: se rompe el vínculo con sus vendedores.</p>
          <Scroll>
            <table className="w-full text-left text-[13px]">
              <thead className={HEAD}>
                <tr>
                  <th scope="col" className={th}>Coordinador</th>
                  <th scope="col" className={th}>Equipo</th>
                  <th scope="col" className={th}>Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {preview.coordinators.map((item, index) => (
                  <tr key={`${item.document ?? item.name}-${index}`} className="align-top">
                    <td className={td}>
                      {item.name ?? "—"} {item.document && <span className="font-mono text-xs text-text-secondary">{item.document}</span>}
                    </td>
                    <td className={td}>{item.team ?? "—"}</td>
                    <td className={td}>{item.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Scroll>
        </Block>
      )}

      {preview.warnings.length > 0 && (
        <Block title={`Advertencias (${preview.warnings.length}): la fila sí se carga`}>
          <ProblemTable items={preview.warnings} />
        </Block>
      )}

      {preview.changes.length === 0 && preview.rejected.length === 0 && (
        <p className="text-sm text-text-secondary">Con este archivo ningún vendedor cambiaría de equipo, clase, regional ni unidad.</p>
      )}
    </section>
  );
}

const HEAD = "sticky top-0 bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary";

function Block({ title, danger = false, children }: { title: string; danger?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h4 className={cn("text-sm font-semibold", danger && "text-danger")}>{title}</h4>
      {children}
    </div>
  );
}

function Scroll({ children }: { children: React.ReactNode }) {
  return <div className="max-h-72 overflow-auto rounded-lg border border-border">{children}</div>;
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <dt className="text-xs text-text-secondary">{label}</dt>
      <dd className="text-xl font-semibold tabular-nums">{formatCount(value)}</dd>
    </div>
  );
}

function TeamList({ title, teams }: { title: string; teams: string[] }) {
  return (
    <div className="rounded-lg border border-border p-3 text-[13px]">
      <p className="mb-1 font-medium">{title}</p>
      <p className="text-text-secondary">{teams.join(", ")}</p>
    </div>
  );
}

function ChangeTable({ items }: { items: VendorChange[] }) {
  return (
    <Scroll>
      <table className="w-full text-left text-[13px]">
        <thead className={HEAD}>
          <tr>
            <th scope="col" className={th}>Vendedor</th>
            <th scope="col" className={th}>Antes → después</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((change) => (
            <tr key={`${change.salesperson_code}-${change.field}`}>
              <td className={td}>
                {change.name ?? "—"} <span className="font-mono text-xs text-text-secondary">{change.salesperson_code}</span>
              </td>
              <td className={td}>
                <span className="text-text-secondary">{change.current ?? "vacío"}</span> → <span className="font-medium">{change.new ?? "vacío"}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Scroll>
  );
}

function ProblemTable({ items, danger = false }: { items: VendorProblem[]; danger?: boolean }) {
  return (
    <Scroll>
      <table className="w-full text-left text-[13px]">
        <thead className={HEAD}>
          <tr>
            <th scope="col" className={th}>Hoja</th>
            <th scope="col" className={th}>Fila</th>
            <th scope="col" className={th}>Valor</th>
            <th scope="col" className={th}>Motivo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item, index) => {
            const blocking = danger && blocksUpload(item);
            return (
              <tr key={`${item.sheet}-${item.row}-${index}`} className={cn("align-top", blocking && "bg-danger-surface")}>
                <td className={cn(td, "whitespace-nowrap")}>{item.sheet}</td>
                <td className={cn(td, "tabular-nums")}>{item.row}</td>
                <td className={cn(td, "max-w-48 truncate")} title={item.value ?? undefined}>
                  {item.value ?? "—"}
                </td>
                <td className={cn(td, danger && "text-danger")}>
                  {item.reason}
                  {blocking && <span className="sr-only">. Bloquea la carga.</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Scroll>
  );
}
