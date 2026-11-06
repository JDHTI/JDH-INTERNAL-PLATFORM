"use client";

import { X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { PersonSelect, personLabel, usePersonSearchState } from "@/shared/components/ui/person-select";

import { usePeople } from "../hooks/use-pqrsf";
import type { Person } from "../types/pqrsf.types";

/** Copies per email, as the API accepts them. */
export const MAX_CC = 5;

/**
 * Picks colleagues to copy on an email, searching the organization's people as
 * you type (the same search box as the assignee). Each pick becomes a chip; the
 * list never repeats a person and stops at {@link MAX_CC}. Only people with an
 * email can be picked, since the copy is an address.
 */
export default function CcPicker({
  id,
  label = "CC (personas de la organización)",
  value,
  onChange,
}: {
  id: string;
  label?: string;
  value: Person[];
  onChange: (value: Person[]) => void;
}) {
  const search = usePersonSearchState();
  const people = usePeople(search.q, search.enabled);
  const taken = new Set(value.map((person) => person.id));
  const results = (people.data ?? []).filter((person) => person.email && !taken.has(person.id));
  const isFull = value.length >= MAX_CC;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[13px] font-medium">
        {label} <span className="font-normal text-text-secondary">(opcional)</span>
      </label>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((person) => (
            <li
              key={person.id}
              className="flex max-w-full items-center gap-1 rounded-sm bg-canvas-subtle py-0.5 pr-0.5 pl-2 text-[13px]"
            >
              <span className="min-w-0 truncate" title={person.email ?? undefined}>
                {personLabel(person)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-6 max-md:size-11"
                aria-label={`Quitar a ${personLabel(person)} de la copia`}
                onClick={() => onChange(value.filter((other) => other.id !== person.id))}
              >
                <X aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <PersonSelect<Person>
        id={id}
        value={null}
        onChange={(person) => {
          if (person && !taken.has(person.id)) onChange([...value, person]);
        }}
        results={results}
        isFetching={people.isFetching}
        onQueryChange={search.onQueryChange}
        onOpenChange={search.onOpenChange}
        placeholder={isFull ? `Máximo ${MAX_CC} personas` : "Agregar persona a la copia"}
        clearLabel="Quitar persona"
        popupLabel="Buscar persona de la organización"
        emptyText="Nadie coincide con esa búsqueda."
        disabled={isFull}
      />
      <p className="text-[13px] text-text-secondary">
        Reciben copia del correo, hasta {MAX_CC} personas.
      </p>
    </div>
  );
}
