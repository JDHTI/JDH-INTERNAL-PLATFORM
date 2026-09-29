"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Popover } from "@base-ui/react/popover";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ExternalLink,
  Loader2,
  MoreHorizontal,
  Paperclip,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/shared/components/ui/button";
import { Menu, MenuItem, MenuSeparator } from "@/shared/components/ui/menu";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import { useAssignCase } from "../hooks/use-pqrsf";
import { formatDate, legacyAssignee, originLabel, personName } from "../lib/format";
import type { CaseSort, Person, PqrsfCase, TrackingCatalog } from "../types/pqrsf.types";
import { DueLabel, StatusBadge } from "./case-badges";
import { AssignDialog, AttachmentsDialog, StatusDialog } from "./case-dialogs";
import { AssigneePicker } from "./pickers";
import { StatusMenu } from "./status-menu";

export const OPTIONAL_COLUMNS = [
  { id: "supplier", label: "Proveedor" },
  { id: "dependency", label: "Dependencia" },
  { id: "requester", label: "Usuario" },
  { id: "documents", label: "Documentos" },
  { id: "origin", label: "Origen" },
] as const;

export type OptionalColumn = (typeof OPTIONAL_COLUMNS)[number]["id"];

type SortField = "code" | "received_on" | "due_on";

type RowDialog =
  | { kind: "status"; item: PqrsfCase; statusId?: string }
  | { kind: "assign"; item: PqrsfCase }
  | { kind: "attachments"; item: PqrsfCase };


/**
 * Desktop: the P.13.F.01 columns in the spreadsheet's order, so the move from
 * Excel keeps the eye where it was. Every cell is one line, so every row is
 * the same 40px. Status and assignee change from their own cell; the rest of
 * the row actions sit in the menu at the end. Phone: one card per case with
 * the four fields that decide the next move (DESIGN.md §10).
 */
export default function CasesTable({
  area,
  catalog,
  cases,
  sort,
  onSortChange,
  columns,
  isStale,
}: {
  area: string;
  catalog: TrackingCatalog;
  cases: PqrsfCase[];
  sort: CaseSort;
  onSortChange: (sort: CaseSort) => void;
  columns: OptionalColumn[];
  isStale: boolean;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<RowDialog | null>(null);
  const href = (item: PqrsfCase) => `/${area}/pqrsf/${item.id}`;
  const show = (column: OptionalColumn) => columns.includes(column);
  const closeDialog = () => setDialog(null);

  const header = (field: SortField, label: string, align: "left" | "right" = "left") => {
    const direction = sort === field ? "ascending" : sort === `-${field}` ? "descending" : "none";
    const Icon = direction === "ascending" ? ArrowUp : direction === "descending" ? ArrowDown : ArrowUpDown;
    return (
      <th
        scope="col"
        aria-sort={direction}
        className={cn("px-3 py-2 whitespace-nowrap", align === "right" && "text-right")}
      >
        <button
          type="button"
          onClick={() => {
            // Due dates read soonest first; codes and receptions, newest first.
            const first = field === "due_on" ? "ascending" : "descending";
            const next = direction === "none" ? first : direction === "ascending" ? "descending" : "ascending";
            onSortChange((next === "ascending" ? field : `-${field}`) as CaseSort);
          }}
          className={cn(
            "inline-flex items-center gap-1 rounded-sm uppercase hover:text-text-primary",
            direction !== "none" && "text-text-primary"
          )}
        >
          {label}
          <Icon className="size-3" aria-hidden="true" />
        </button>
      </th>
    );
  };

  return (
    <div className={cn("transition-opacity", isStale && "opacity-60")} aria-busy={isStale}>
      {/* The container scrolls sideways when every optional column is on at a
          narrow desktop width; the page itself never does. */}
      <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
        <table className="w-full min-w-[64rem] text-sm">
          <thead className="bg-canvas-subtle text-left text-[11px] font-semibold tracking-[0.06em] text-text-secondary uppercase">
            <tr>
              {header("code", "Consecutivo")}
              {header("received_on", "Recepción", "right")}
              <th scope="col" className="px-3 py-2">Cliente</th>
              {show("supplier") && <th scope="col" className="px-3 py-2">Proveedor</th>}
              {show("dependency") && <th scope="col" className="px-3 py-2">Dependencia</th>}
              {show("requester") && <th scope="col" className="px-3 py-2">Usuario</th>}
              {show("documents") && (
                <th scope="col" className="px-3 py-2 text-right whitespace-nowrap">Documentos</th>
              )}
              <th scope="col" className="px-3 py-2">Ejecutivo comercial</th>
              <th scope="col" className="px-3 py-2">Responsable</th>
              <th scope="col" className="px-3 py-2">Sucursal</th>
              <th scope="col" className="px-3 py-2">Tipo</th>
              {show("origin") && <th scope="col" className="px-3 py-2">Origen</th>}
              {header("due_on", "Vence", "right")}
              <th scope="col" className="px-3 py-2">Estado</th>
              <th scope="col" className="w-12 px-2 py-2">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {cases.map((item) => (
              <tr
                key={item.id}
                // The code cell holds the real link for keyboard and screen
                // readers; the row click is a mouse shortcut on top of it.
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest("a, button")) return;
                  if (window.getSelection()?.toString()) return;
                  router.push(href(item));
                }}
                className="h-10 cursor-pointer hover:bg-primary-subtle [&>td]:whitespace-nowrap"
              >
                <td className="px-3 py-1">
                  <Link
                    href={href(item)}
                    className="rounded-sm font-mono text-[13px] font-medium underline-offset-2 hover:underline"
                  >
                    {item.code}
                  </Link>
                </td>
                <td className="tabular px-3 py-1 text-right">{formatDate(item.received_on)}</td>
                <td className="max-w-56 px-3 py-1">
                  <Clipped
                    text={item.customer_name}
                    title={
                      item.customer_name && item.customer_nit
                        ? `${item.customer_name} · NIT ${item.customer_nit}`
                        : undefined
                    }
                  />
                </td>
                {show("supplier") && (
                  <td className="max-w-48 px-3 py-1">
                    <Clipped text={item.supplier_name} />
                  </td>
                )}
                {show("dependency") && (
                  <td className="max-w-40 px-3 py-1">
                    <Clipped text={item.dependency?.name} />
                  </td>
                )}
                {show("requester") && (
                  <td className="max-w-44 px-3 py-1">
                    <Clipped text={item.requester_name} />
                  </td>
                )}
                {show("documents") && (
                  <td className="px-3 py-1 text-right">
                    <Documents item={item} />
                  </td>
                )}
                <td className="max-w-44 px-3 py-1">
                  <Clipped text={item.sales_executive_name} />
                </td>
                {/* Cells with their own controls stop the click: the popups
                    are portaled, but React still bubbles their events here. */}
                <td className="max-w-48 px-1.5 py-1" onClick={(event) => event.stopPropagation()}>
                  <AssigneeCell item={item} />
                </td>
                <td className="px-3 py-1">{item.site?.name ?? <Empty />}</td>
                <td className="px-3 py-1">{item.request_type.name}</td>
                {show("origin") && <td className="px-3 py-1">{originLabel(item.origin)}</td>}
                <td className="px-3 py-1 text-right">
                  <DueLabel item={item} layout="row" />
                </td>
                <td className="px-1.5 py-1" onClick={(event) => event.stopPropagation()}>
                  <StatusMenu
                    item={item}
                    catalog={catalog}
                    onNeedsDialog={(statusId) => setDialog({ kind: "status", item, statusId })}
                  />
                </td>
                <td className="px-2 py-1 text-right" onClick={(event) => event.stopPropagation()}>
                  <RowActions
                    item={item}
                    onOpen={() => router.push(href(item))}
                    onDialog={setDialog}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border md:hidden">
        {cases.map((item) => (
          <li key={item.id}>
            <Link
              href={href(item)}
              className="block space-y-1.5 p-3 hover:bg-primary-subtle focus-visible:outline-offset-[-2px]"
            >
              <span className="flex items-start justify-between gap-3">
                <span className="font-mono text-[13px] font-medium">{item.code}</span>
                <StatusBadge status={item.status} />
              </span>
              <span className="block truncate font-medium">
                {item.customer_name ?? "Sin cliente"}
              </span>
              <span className="block text-[13px]">
                <DueLabel item={item} layout="inline" />
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {dialog?.kind === "status" && (
        <StatusDialog
          item={dialog.item}
          catalog={catalog}
          initialStatusId={dialog.statusId}
          open
          onOpenChange={closeDialog}
        />
      )}
      {dialog?.kind === "assign" && <AssignDialog item={dialog.item} open onOpenChange={closeDialog} />}
      {dialog?.kind === "attachments" && (
        <AttachmentsDialog item={dialog.item} open onOpenChange={closeDialog} />
      )}
    </div>
  );
}

function Empty() {
  return <span className="text-text-secondary">Sin dato</span>;
}

function Clipped({ text, title }: { text: string | null | undefined; title?: string }) {
  if (!text) return <Empty />;
  return (
    <span className="block truncate" title={title ?? text}>
      {text}
    </span>
  );
}

/** "2 de 3": the spreadsheet's extra rows, folded into one cell. */
function Documents({ item }: { item: PqrsfCase }) {
  if (item.item_count === 0) return <Empty />;
  const pending = item.item_count - item.responded_count;
  return (
    <span
      className="tabular"
      title={pending === 0 ? "Todos respondidos" : `${pending} por responder`}
    >
      {item.responded_count} de {item.item_count}
    </span>
  );
}

/** Same look as a plain cell until hovered, so the table does not read as a form. */
const cellTrigger = cn(
  "flex h-8 max-w-full items-center gap-1 rounded-sm px-1.5 text-left",
  "transition-colors duration-150 hover:bg-canvas-subtle data-[popup-open]:bg-canvas-subtle",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
  "disabled:pointer-events-none"
);

function AssigneeName({ item }: { item: PqrsfCase }) {
  if (item.assignee) {
    return <span className="truncate">{personName(item.assignee)}</span>;
  }
  const legacy = legacyAssignee(item);
  if (legacy) {
    return (
      <span className="truncate text-text-secondary" title={`Responsable (histórico): ${legacy}`}>
        {legacy} <span className="text-[13px]">(histórico)</span>
      </span>
    );
  }
  return <span className="text-text-secondary">Sin asignar</span>;
}

/** Assigns from the cell: pick a person and it is saved, no dialog in between. */
function AssigneeCell({ item }: { item: PqrsfCase }) {
  const [open, setOpen] = useState(false);
  const mutation = useAssignCase(item.id);

  if (!item.permissions.can_assign) {
    return (
      <span className="block truncate px-1.5">
        <AssigneeName item={item} />
      </span>
    );
  }

  const assign = (person: Person | null) => {
    if ((person?.id ?? null) === (item.assignee?.id ?? null)) return setOpen(false);
    mutation.mutate(
      { assignee_user_id: person?.id ?? null },
      {
        onSuccess: (updated) => {
          toast.success(
            updated.assignee
              ? `${updated.code} asignado a ${personName(updated.assignee)}.`
              : `${updated.code} quedó sin responsable.`
          );
          setOpen(false);
        },
      }
    );
  };

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (mutation.isPending) return;
        if (next) mutation.reset();
        setOpen(next);
      }}
    >
      <Popover.Trigger
        className={cellTrigger}
        aria-label={`Responsable de ${item.code}: ${personName(item.assignee) || "sin asignar"}. Cambiar`}
      >
        <AssigneeName item={item} />
        {mutation.isPending ? (
          <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden="true" />
        ) : (
          <ChevronDown className="size-3.5 shrink-0 text-text-secondary" aria-hidden="true" />
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={4} className="z-50">
          <Popover.Popup className="w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-surface-raised p-3 text-text-primary shadow-modal outline-none">
            <Popover.Title className="text-sm font-semibold">Asignar {item.code}</Popover.Title>
            <Popover.Description className="mt-0.5 mb-3 text-[13px] text-text-secondary">
              Se guarda al elegir la persona.
            </Popover.Description>
            <AssigneePicker
              value={item.assignee}
              onChange={(person) => person && assign(person)}
              placeholder="Buscar por nombre o correo"
              aria-label="Responsable"
              disabled={mutation.isPending}
            />
            {mutation.error && (
              <p role="alert" className="mt-3 rounded-md bg-danger-surface px-3 py-2 text-[13px] text-danger">
                {errorMessage(mutation.error)}
              </p>
            )}
            {item.assignee && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 max-md:h-11"
                disabled={mutation.isPending}
                onClick={() => assign(null)}
              >
                Dejar sin responsable
              </Button>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function RowActions({
  item,
  onOpen,
  onDialog,
}: {
  item: PqrsfCase;
  onOpen: () => void;
  onDialog: (dialog: RowDialog) => void;
}) {
  const canAssign = item.permissions.can_assign;
  // Only public-form cases carry the customer's files.
  const hasRequest = item.request_id !== null;

  return (
    <Menu
      align="end"
      triggerClassName={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "data-[popup-open]:bg-canvas-subtle")}
      triggerLabel={`Acciones de ${item.code}`}
      trigger={<MoreHorizontal aria-hidden="true" />}
    >
      <MenuItem onClick={onOpen}>
        <ExternalLink aria-hidden="true" />
        Abrir caso
      </MenuItem>
      <MenuSeparator />
      <MenuItem disabled={!canAssign} onClick={() => onDialog({ kind: "assign", item })}>
        <UserRound aria-hidden="true" />
        Asignar con nota
      </MenuItem>
      <MenuItem disabled={!hasRequest} onClick={() => onDialog({ kind: "attachments", item })}>
        <Paperclip aria-hidden="true" />
        {hasRequest ? "Ver adjuntos" : "Sin adjuntos"}
      </MenuItem>
    </Menu>
  );
}
