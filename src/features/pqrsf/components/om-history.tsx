"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { AlertTriangle, ArrowLeft, Check, CloudOff, Download, FileText, Search } from "lucide-react";
import { toast } from "sonner";

import PageHeader from "@/shared/components/page-header";
import Pager from "@/shared/components/pager";
import StatePanel from "@/shared/components/state-panel";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Input } from "@/shared/components/ui/input";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";
import { useBreadcrumbLabel } from "@/shared/store/use-breadcrumb-store";

import { useCatalog, useOmHistory } from "../hooks/use-pqrsf";
import { formatDateTime } from "../lib/format";
import { inboxHref } from "../lib/inbox-state";
import { downloadOm } from "../services/pqrsf.service";
import type { OmHistoryFilters, OmHistoryItem } from "../types/pqrsf.types";

const PAGE_SIZE = 25;
/** From this many days without an answer the wait is flagged. */
const LATE_DAYS = 8;

type Card = "drafts" | "awaiting" | "replied";

const CARD_FILTERS: Record<Card, Pick<OmHistoryFilters, "status" | "replied">> = {
  drafts: { status: "draft" },
  awaiting: { status: "sent", replied: false },
  replied: { replied: true },
};

const day = (iso: string) => formatDateTime(iso).split(",")[0];

/**
 * Every improvement opportunity of every case, to follow up the suppliers: which
 * ones are still drafts, which went out and nobody answered, and which got an
 * answer. The three counters are also the quickest filters. An OM waiting 8 days
 * or more is flagged with an icon and the days, not only a color.
 */
export default function OmHistory({ area }: { area: string }) {
  const catalog = useCatalog();
  useBreadcrumbLabel(`/${area}/pqrsf/oportunidades-mejora`, "Oportunidades de mejora");

  const [search, setSearch] = useState("");
  const [supplier, setSupplier] = useState("");
  const q = useDebouncedValue(search.trim());
  const supplierQuery = useDebouncedValue(supplier.trim());
  const [filters, setFilters] = useState<OmHistoryFilters>({});
  const [page, setPage] = useState(1);

  const active: OmHistoryFilters = { ...filters, q: q || undefined, supplier: supplierQuery || undefined };
  const history = useOmHistory(active, page, PAGE_SIZE);
  const data = history.data;
  const items = data?.items ?? [];

  const set = (patch: Partial<OmHistoryFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  };
  const pressed = (card: Card) => {
    const wanted = CARD_FILTERS[card];
    return filters.status === wanted.status && filters.replied === wanted.replied;
  };
  const toggle = (card: Card) => {
    setFilters((current) => {
      // A counter replaces whatever state filter there was; pressing it again clears it.
      const next: OmHistoryFilters = { ...current, status: undefined, replied: undefined };
      return pressed(card) ? next : { ...next, ...CARD_FILTERS[card] };
    });
    setPage(1);
  };
  const hasFilters = Object.values(active).some((value) => value !== undefined && value !== "");

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link
          href={inboxHref(area) as Route}
          className="inline-flex items-center gap-1.5 rounded-sm text-sm text-text-secondary hover:text-text-primary max-md:min-h-11"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver a la bandeja
        </Link>
        <PageHeader
          title="Oportunidades de mejora"
          description="Las OM de todos los casos: cuáles siguen en borrador, cuáles se enviaron y esperan respuesta del proveedor y cuáles ya tuvieron respuesta."
        />
      </div>

      <div role="group" aria-label="Estado de las OM" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <CounterCard label="Borradores" hint="Generadas, sin enviar" value={data?.drafts} pressed={pressed("drafts")} onClick={() => toggle("drafts")} />
        <CounterCard label="Esperando respuesta" hint="Enviadas, el proveedor no ha contestado" value={data?.awaiting_reply} pressed={pressed("awaiting")} onClick={() => toggle("awaiting")} />
        <CounterCard label="Respondidas" hint="El proveedor contestó por correo" value={data?.replied} pressed={pressed("replied")} onClick={() => toggle("replied")} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
          <Input
            type="search"
            aria-label="Buscar por OM, radicado, cliente o proveedor"
            placeholder="OM, radicado, cliente o proveedor"
            className="pl-8 max-md:h-11"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <Input
          aria-label="Proveedor"
          placeholder="Proveedor"
          className="max-md:h-11"
          value={supplier}
          onChange={(event) => {
            setSupplier(event.target.value);
            setPage(1);
          }}
        />
        <Dropdown
          aria-label="Sede"
          placeholder="Sede"
          clearable
          clearLabel="Quitar la sede"
          value={filters.site_id ?? ""}
          onValueChange={(value) => set({ site_id: value || undefined })}
          options={(catalog.data?.sites ?? []).filter((site) => site.is_active).map((site) => ({ value: site.id, label: site.name }))}
          className="max-md:h-11"
        />
        <div className="grid grid-cols-2 gap-2">
          <DatePicker aria-label="Enviada desde" value={filters.sent_from ?? ""} onChange={(value) => set({ sent_from: value || undefined })} placeholder="Desde" clearable max={filters.sent_to} className="max-md:h-11" />
          <DatePicker aria-label="Enviada hasta" value={filters.sent_to ?? ""} onChange={(value) => set({ sent_to: value || undefined })} placeholder="Hasta" clearable min={filters.sent_from} className="max-md:h-11" />
        </div>
      </div>
      {hasFilters && (
        <button
          type="button"
          className="rounded-sm text-[13px] text-text-secondary underline underline-offset-4 hover:text-text-primary max-md:min-h-11"
          onClick={() => {
            setSearch("");
            setSupplier("");
            setFilters({});
            setPage(1);
          }}
        >
          Quitar los filtros
        </button>
      )}

      {history.isPending ? (
        <div className="h-64 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true">
          <span className="sr-only">Cargando las oportunidades de mejora</span>
        </div>
      ) : history.isError ? (
        <StatePanel
          icon={CloudOff}
          tone="danger"
          title="No se cargaron las OM"
          action={
            <Button variant="outline" onClick={() => history.refetch()}>
              Reintentar
            </Button>
          }
        >
          {errorMessage(history.error)}
        </StatePanel>
      ) : items.length === 0 ? (
        <StatePanel icon={FileText} title={hasFilters ? "Ninguna OM coincide" : "Todavía no hay OM"}>
          {hasFilters ? "Quita algún filtro para ver más." : "Las OM se generan desde un caso, en su sección «Oportunidad de mejora»."}
        </StatePanel>
      ) : (
        <div className={cn("space-y-3 transition-opacity", history.isPlaceholderData && "opacity-60")}>
          <Table area={area} items={items} />
          <Pager page={page} size={PAGE_SIZE} total={data!.total} count={items.length} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}

// ── Pieces ──

function CounterCard({
  label,
  hint,
  value,
  pressed,
  onClick,
}: {
  label: string;
  hint: string;
  value: number | undefined;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "space-y-0.5 rounded-lg border p-3 text-left max-md:min-h-11",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        pressed ? "border-primary bg-primary-subtle" : "border-border hover:bg-canvas-subtle"
      )}
    >
      <span className="block text-[13px] text-text-secondary">{label}</span>
      <span className="tabular block text-2xl font-semibold">{value === undefined ? "" : value}</span>
      <span className="block text-[13px] text-text-secondary">{hint}</span>
    </button>
  );
}

/** Answered with its date, still waiting with its days (flagged from 8), or not sent at all. */
function ReplyState({ item }: { item: OmHistoryItem }) {
  if (item.status === "draft") return <Badge>Borrador</Badge>;
  if (item.replied_at) {
    return (
      <Badge tone="success">
        <Check aria-hidden="true" />
        Respondida
        <span className="tabular font-normal">· {day(item.replied_at)}</span>
      </Badge>
    );
  }
  const days = item.days_waiting ?? 0;
  const late = days >= LATE_DAYS;
  return (
    <Badge tone={late ? "danger" : "neutral"}>
      {late && <AlertTriangle aria-hidden="true" />}
      Esperando
      <span className="tabular font-normal">· {days === 1 ? "1 día" : `${days} días`}</span>
    </Badge>
  );
}

function PdfButton({ item }: { item: OmHistoryItem }) {
  const [busy, setBusy] = useState(false);
  if (!item.has_pdf) return <span className="text-[13px] text-text-secondary">Sin PDF</span>;
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="max-md:size-11"
      disabled={busy}
      aria-label={`Descargar el PDF de la OM ${item.code}`}
      onClick={async () => {
        setBusy(true);
        try {
          await downloadOm(item.case_id, item.id, "pdf", `OM ${item.code}.pdf`);
        } catch (error) {
          toast.error(errorMessage(error), { duration: Infinity });
        } finally {
          setBusy(false);
        }
      }}
    >
      <Download aria-hidden="true" />
    </Button>
  );
}

function Table({ area, items }: { area: string; items: OmHistoryItem[] }) {
  const caseHref = (item: OmHistoryItem) => `/${area}/pqrsf/${item.case_id}` as Route;
  return (
    <>
      <div className="relative hidden overflow-x-auto rounded-lg border border-border md:block">
        <table className="w-full min-w-[60rem] text-left text-sm">
          <thead className="bg-canvas-subtle text-[11px] font-semibold tracking-[0.06em] text-text-secondary uppercase">
            <tr>
              <th scope="col" className="px-3 py-2">OM</th>
              <th scope="col" className="px-3 py-2">Proveedor</th>
              <th scope="col" className="px-3 py-2">Caso</th>
              <th scope="col" className="px-3 py-2">Cliente y sede</th>
              <th scope="col" className="px-3 py-2 whitespace-nowrap">Enviada</th>
              <th scope="col" className="px-3 py-2">Respuesta</th>
              <th scope="col" className="px-3 py-2">Estado del caso</th>
              <th scope="col" className="px-3 py-2">
                <span className="sr-only">PDF</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item) => (
              <tr key={item.id} className="align-top hover:bg-primary-subtle">
                <td className="px-3 py-2 font-mono text-[13px] font-medium whitespace-nowrap">{item.code}</td>
                <td className="px-3 py-2">{item.supplier_name ?? item.supplier_code ?? <span className="text-text-secondary">Sin proveedor</span>}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <Link href={caseHref(item)} className="rounded-sm font-mono text-[13px] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                    {item.case_code}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <span className="block break-words">{item.customer_name ?? <span className="text-text-secondary">Sin cliente</span>}</span>
                  {item.site_name && <span className="block text-[13px] text-text-secondary">{item.site_name}</span>}
                </td>
                <td className="px-3 py-2">
                  {item.sent_at ? (
                    <>
                      <span className="tabular block whitespace-nowrap">{day(item.sent_at)}</span>
                      {item.sent_to.length > 0 && <span className="block max-w-56 text-[13px] break-all text-text-secondary">{item.sent_to.join(", ")}</span>}
                    </>
                  ) : (
                    <span className="text-text-secondary">Sin enviar</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <ReplyState item={item} />
                </td>
                <td className="px-3 py-2">
                  {item.case_status}
                  {item.case_closed && <span className="block text-[13px] text-text-secondary">Caso cerrado</span>}
                </td>
                <td className="px-2 py-1 text-right">
                  <PdfButton item={item} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border md:hidden">
        {items.map((item) => (
          <li key={item.id} className="space-y-1.5 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-[13px] font-medium">{item.code}</span>
              <ReplyState item={item} />
            </div>
            <p className="break-words">{item.supplier_name ?? item.supplier_code ?? "Sin proveedor"}</p>
            <p className="text-[13px] text-text-secondary">
              <Link href={caseHref(item)} className="font-mono underline underline-offset-4">
                {item.case_code}
              </Link>
              {item.customer_name ? ` · ${item.customer_name}` : ""}
              {item.site_name ? ` · ${item.site_name}` : ""}
            </p>
            <p className="text-[13px] text-text-secondary">
              {item.sent_at ? `Enviada el ${day(item.sent_at)}${item.sent_to.length > 0 ? ` a ${item.sent_to.join(", ")}` : ""}` : "Sin enviar"} · Caso: {item.case_status}
              {item.case_closed ? " (cerrado)" : ""}
            </p>
            <PdfButton item={item} />
          </li>
        ))}
      </ul>
    </>
  );
}
