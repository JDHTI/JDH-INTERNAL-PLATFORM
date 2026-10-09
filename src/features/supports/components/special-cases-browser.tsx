"use client";

import { useState } from "react";
import Link from "next/link";
import { CloudOff, FileX2, Plus, RefreshCw, Search } from "lucide-react";

import Pager from "@/shared/components/pager";
import StatePanel from "@/shared/components/state-panel";
import { Badge, type BadgeTone } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Input } from "@/shared/components/ui/input";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { ApiError, errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import { useCanManage, useSpecialCases } from "../hooks/use-supports";
import { CASE_STATUS_LABELS, formatDay, PRIORITY_LABELS } from "../lib/format";
import type { SpecialCase, SpecialCasePriority, SpecialCaseStatus } from "../types/support.types";
import SpecialCaseDialog from "./special-case-dialog";

const PAGE_SIZE = 25;
const ALL = "";

const STATUS_TONE: Record<SpecialCaseStatus, BadgeTone> = {
  pendiente: "warning",
  en_analisis: "info",
  programado: "info",
  implementado: "success",
  descartado: "neutral",
};

const PRIORITY_TONE: Record<SpecialCasePriority, BadgeTone> = {
  alta: "danger",
  media: "warning",
  baja: "neutral",
};

const numberFormat = new Intl.NumberFormat("es-CO");

/**
 * Follow-up of requests about particular clients, which later become business
 * rules in code. Reading is open; opening and following up a case is for
 * managers, and a 403 from the API takes those controls away.
 */
export default function SpecialCasesBrowser({ area }: { area: string }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<string>(ALL);
  const [page, setPage] = useState(1);
  const [denied, setDenied] = useState(false);
  const canWrite = useCanManage() && !denied;
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const q = useDebouncedValue(text.trim());

  const cases = useSpecialCases({ q, status, page, size: PAGE_SIZE });
  const result = cases.data;
  const items = result?.items ?? [];
  const editing = items.find((item) => item.id === editId) ?? null;
  const filtered = q !== "" || status !== ALL;

  const statusOptions = [
    { value: ALL, label: "Todos los estados" },
    ...Object.entries(CASE_STATUS_LABELS).map(([value, label]) => ({ value, label })),
  ];

  const supportsHref = (item: SpecialCase) =>
    `/${area}/apoyos?caso=${encodeURIComponent(item.id)}&codigo=${encodeURIComponent(item.code)}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-secondary"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setPage(1);
            }}
            placeholder="Buscar por código, título o cliente"
            aria-label="Buscar casos especiales"
            className="pl-9"
          />
        </div>
        <Dropdown
          className="sm:w-52"
          value={status}
          onValueChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
          options={statusOptions}
          aria-label="Filtrar por estado"
        />
        {canWrite && (
          <Button onClick={() => setCreating(true)}>
            <Plus aria-hidden="true" /> Nuevo caso
          </Button>
        )}
      </div>

      {cases.isPending ? (
        <div className="h-64 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando casos" />
      ) : cases.isError && !result ? (
        <StatePanel
          icon={CloudOff}
          tone="danger"
          title={
            cases.error instanceof ApiError && cases.error.status === 429
              ? "Demasiadas consultas seguidas"
              : "No se pudieron cargar los casos"
          }
          action={
            <Button variant="outline" onClick={() => cases.refetch()}>
              <RefreshCw aria-hidden="true" /> Reintentar
            </Button>
          }
        >
          {errorMessage(cases.error)}
        </StatePanel>
      ) : items.length === 0 ? (
        <StatePanel icon={FileX2} title={filtered ? "Ningún caso coincide con los filtros" : "Aún no hay casos especiales"}>
          {filtered
            ? "Prueba con otro texto o quita el filtro de estado."
            : "Un caso nace cuando una petición sobre un cliente puntual necesita seguimiento o una regla en código."}
        </StatePanel>
      ) : (
        <div className={cn("space-y-3", cases.isPlaceholderData && "opacity-60")}>
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full min-w-[56rem] text-left text-sm">
              <thead className="bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
                <tr>
                  <th scope="col" className="px-3 py-2">Caso</th>
                  <th scope="col" className="px-3 py-2">Proveedor y cliente</th>
                  <th scope="col" className="px-3 py-2">Estado</th>
                  <th scope="col" className="px-3 py-2">Prioridad</th>
                  <th scope="col" className="px-3 py-2">Responsable</th>
                  <th scope="col" className="px-3 py-2">Actualizado</th>
                  <th scope="col" className="px-3 py-2 text-right">Apoyos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item) => (
                  <tr key={item.id} className="align-top hover:bg-primary-subtle">
                    <td className="max-w-md px-3 py-2">
                      <span className="block font-mono text-xs text-text-secondary">{item.code}</span>
                      {canWrite ? (
                        <button
                          type="button"
                          onClick={() => setEditId(item.id)}
                          className={cn(
                            "rounded-sm text-left font-medium hover:underline",
                            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                          )}
                        >
                          {item.title}
                        </button>
                      ) : (
                        <span className="font-medium">{item.title}</span>
                      )}
                      {item.rule_to_program && (
                        <span className="mt-0.5 line-clamp-2 block text-xs text-text-secondary">{item.rule_to_program}</span>
                      )}
                    </td>
                    <td className="max-w-56 px-3 py-2">
                      <span className="block truncate">{item.supplier_name ?? "—"}</span>
                      <span className="block truncate text-xs text-text-secondary">
                        {item.customer_name ?? "Sin cliente"}
                        {item.customer_nit ? ` · ${item.customer_nit}` : ""}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={STATUS_TONE[item.status] ?? "neutral"}>{CASE_STATUS_LABELS[item.status] ?? item.status}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={PRIORITY_TONE[item.priority] ?? "neutral"}>{PRIORITY_LABELS[item.priority] ?? item.priority}</Badge>
                    </td>
                    <td className="px-3 py-2">{item.assignee ?? "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums">{formatDay(item.updated_at)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {item.support_count > 0 ? (
                        <Link
                          href={supportsHref(item)}
                          className="rounded-sm font-medium underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                          aria-label={`Ver los ${item.support_count} apoyos del caso ${item.code}`}
                        >
                          {numberFormat.format(item.support_count)}
                        </Link>
                      ) : (
                        <span className="text-text-secondary">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {result && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs tabular-nums text-text-secondary">
                {numberFormat.format(result.total)} {result.total === 1 ? "caso" : "casos"}
              </span>
              <Pager page={result.page} size={result.size} total={result.total} count={items.length} onPageChange={setPage} />
            </div>
          )}
        </div>
      )}

      <SpecialCaseDialog open={creating} existing={null} onClose={() => setCreating(false)} onForbidden={() => setDenied(true)} />
      <SpecialCaseDialog open={editing !== null} existing={editing} onClose={() => setEditId(null)} onForbidden={() => setDenied(true)} />
    </div>
  );
}
