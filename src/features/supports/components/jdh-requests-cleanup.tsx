"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import Pager from "@/shared/components/pager";
import { Alert } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Input } from "@/shared/components/ui/input";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { errorMessage } from "@/shared/lib/api-client";

import { useDeleteRequests, useRequests } from "../hooks/use-requests";
import type { RequestStatus } from "../types/request.types";
import DeleteRequestsDialog from "./delete-requests-dialog";
import RequestRows from "./request-rows";

const PAGE_SIZE = 25;

const STATUSES = [
  { value: "", label: "Todos los estados" },
  { value: "pendiente", label: "Pendientes" },
  { value: "aprobada", label: "Aprobadas" },
  { value: "rechazada", label: "Rechazadas" },
];

/**
 * The JDH requests on a support (`/supplier-support-requests`), whose tray left in 27e4bf0, back
 * only to delete them: listed, ticked and deleted for good by whoever may (`can_delete`). They are
 * not decided here; what was approved stays in the supports (decided 2026-11-23).
 */
export default function JdhRequestsCleanup() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [text, setText] = useState("");
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const q = useDebouncedValue(text.trim());
  const query = useRequests(
    { page, size: PAGE_SIZE, status: (status || undefined) as RequestStatus | undefined, q: q || undefined },
    true,
    "cleanup"
  );
  const remove = useDeleteRequests();
  const items = query.data?.items ?? [];

  const toggle = (id: string) =>
    setTicked((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const togglePage = () =>
    setTicked((current) => {
      const next = new Set(current);
      const all = items.every((item) => next.has(item.id));
      for (const item of items) {
        if (all) next.delete(item.id);
        else next.add(item.id);
      }
      return next;
    });

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Las solicitudes de margen JDH sobre un apoyo, de antes de las solicitudes internas. Aquí solo se eliminan: lo que ya se
        aprobó se conserva en los apoyos.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          aria-label="Buscar por cliente, proveedor o referencia"
          type="search"
          maxLength={100}
          placeholder="Cliente, proveedor o referencia"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setPage(1);
          }}
        />
        <Dropdown
          aria-label="Estado de la solicitud"
          value={status}
          options={STATUSES}
          onValueChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        />
      </div>
      {ticked.size > 0 && (
        <div className="flex flex-wrap items-center gap-3" aria-live="polite">
          <span className="text-sm tabular-nums text-text-secondary">
            {ticked.size === 1 ? "1 solicitud seleccionada" : `${ticked.size.toLocaleString("es-CO")} solicitudes seleccionadas`}
          </span>
          <Button variant="danger" size="sm" onClick={() => setDeleting(true)} className="max-md:h-11">
            <Trash2 aria-hidden="true" /> Eliminar
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setTicked(new Set())} className="max-md:h-11">
            Quitar la selección
          </Button>
        </div>
      )}
      {notice && <Alert severity="success" onDismiss={() => setNotice(null)}>{notice}</Alert>}
      {query.isPending ? (
        <p aria-busy="true" className="text-sm text-text-secondary">Cargando solicitudes…</p>
      ) : query.isError ? (
        <Alert severity="danger">
          {errorMessage(query.error)}{" "}
          <Button variant="outline" size="sm" onClick={() => void query.refetch()}>Reintentar</Button>
        </Alert>
      ) : items.length === 0 ? (
        <p className="text-sm text-text-secondary">
          {status || q ? "Ninguna solicitud coincide con estos filtros." : "No quedan solicitudes JDH."}
        </p>
      ) : (
        <>
          <RequestRows items={items} selection={{ ticked, onToggle: toggle, onTogglePage: togglePage }} />
          <Pager page={query.data.page} size={query.data.size} total={query.data.total} count={items.length} onPageChange={setPage} />
        </>
      )}
      <DeleteRequestsDialog
        ids={deleting ? [...ticked] : []}
        remove={remove}
        onClose={() => setDeleting(false)}
        onDone={(deleted) => {
          setDeleting(false);
          setTicked(new Set());
          setNotice(deleted === 1 ? "Se eliminó 1 solicitud." : `Se eliminaron ${deleted.toLocaleString("es-CO")} solicitudes.`);
        }}
      />
    </div>
  );
}
