"use client";

import { PersonSelect, usePersonSearchState } from "@/shared/components/ui/person-select";

import { usePeopleSearch } from "../hooks/use-projects";
import type { Person } from "../types/project.types";
import { useProjectsContext } from "./projects-context";

/** Active platform users; any member of the area may pick one. */
export default function OwnerSelect({
  id,
  value,
  onChange,
  disabled,
}: {
  id?: string;
  value: Person | null;
  onChange: (value: Person | null) => void;
  disabled?: boolean;
}) {
  const { slug } = useProjectsContext();
  const search = usePersonSearchState();
  const people = usePeopleSearch(slug, search.q, search.enabled);

  return (
    <PersonSelect
      id={id}
      value={value}
      onChange={onChange}
      results={people.data ?? []}
      isFetching={people.isFetching}
      onQueryChange={search.onQueryChange}
      onOpenChange={search.onOpenChange}
      placeholder="Sin responsable"
      clearLabel="Quitar responsable"
      popupLabel="Buscar responsable"
      disabled={disabled}
    />
  );
}
