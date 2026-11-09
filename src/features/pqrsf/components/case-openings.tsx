"use client";

import { useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { Eye } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { errorMessage } from "@/shared/lib/api-client";

import { useCaseOpenings } from "../hooks/use-pqrsf";
import { formatDateTime, personName } from "../lib/format";
import type { CaseOpeningPerson } from "../types/pqrsf.types";
import { StatusChip } from "./event-line";

function whoOpened(person: CaseOpeningPerson): string {
  return personName(person.user) || "Usuario que ya no existe";
}

/**
 * Who opened the case, kept off the timeline: a quiet link in the header that
 * asks the API only when it opens. People first (first and last time, visits),
 * every single opening folded below for whoever needs the detail.
 */
export default function CaseOpenings({ caseId }: { caseId: string }) {
  const [open, setOpen] = useState(false);
  const openings = useCaseOpenings(caseId, open);
  const people = openings.data?.people ?? [];
  const entries = openings.data?.entries ?? [];

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className="inline-flex items-center gap-1.5 rounded-sm text-[13px] text-text-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:min-h-11"
      >
        <Eye className="size-3.5 shrink-0" aria-hidden="true" />
        Quién lo abrió
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={6} className="z-50">
          <Popover.Popup className="max-h-[min(30rem,calc(100dvh-4rem))] w-96 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-lg border border-border bg-surface-raised p-3 text-sm text-text-primary shadow-modal outline-none">
            <Popover.Title className="mb-2 text-sm font-semibold">
              {openings.data
                ? people.length === 0
                  ? "Quién abrió el caso"
                  : `Visto por ${people.length} ${people.length === 1 ? "persona" : "personas"}`
                : "Quién abrió el caso"}
            </Popover.Title>

            {openings.isPending ? (
              <p role="status" className="text-text-secondary">
                Cargando
              </p>
            ) : openings.isError ? (
              <div className="space-y-2">
                <p role="alert" className="text-danger">
                  {errorMessage(openings.error)}
                </p>
                <Button variant="outline" size="sm" className="max-md:h-11" onClick={() => openings.refetch()}>
                  Reintentar
                </Button>
              </div>
            ) : people.length === 0 ? (
              <p className="text-text-secondary">Nadie ha abierto el caso todavía.</p>
            ) : (
              <>
                <ul className="space-y-3">
                  {people.map((person) => (
                    <li key={person.user_id ?? person.first_opened_at} className="min-w-0">
                      <p className="font-medium break-words">{whoOpened(person)}</p>
                      <p className="text-[13px] text-text-secondary">
                        Primera vez <span className="tabular">{formatDateTime(person.first_opened_at)}</span>
                      </p>
                      <p className="text-[13px] text-text-secondary">
                        Última <span className="tabular">{formatDateTime(person.last_opened_at)}</span>
                        {" · "}
                        <span className="tabular">{person.visits}</span>{" "}
                        {person.visits === 1 ? "visita" : "visitas"}
                      </p>
                    </li>
                  ))}
                </ul>
                {entries.length > 0 && (
                  <details className="mt-3 border-t border-border pt-2">
                    <summary className="cursor-pointer rounded-sm py-1 text-[13px] text-text-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:py-3">
                      Cada apertura ({entries.length})
                    </summary>
                    <ol className="mt-2 space-y-2">
                      {entries.map((entry) => (
                        <li key={entry.id} className="min-w-0 text-[13px]">
                          <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                            <span className="break-words">
                              <span className="font-medium text-text-primary">{entry.actor_name}</span>
                              <span className="text-text-secondary"> · {entry.title}</span>
                            </span>
                            {entry.status_change && <StatusChip change={entry.status_change} />}
                          </p>
                          <time
                            dateTime={entry.created_at}
                            className="tabular text-text-secondary"
                          >
                            {formatDateTime(entry.created_at)}
                          </time>
                        </li>
                      ))}
                    </ol>
                  </details>
                )}
              </>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
