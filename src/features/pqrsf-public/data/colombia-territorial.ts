import {
  getDepartamentos,
  getMunicipios,
} from "colombia-territorial";

import type {
  SearchableDropdownOption,
} from "@/shared/components/ui/searchable-dropdown";

export const COLOMBIA_DEPARTMENTS: SearchableDropdownOption[] = getDepartamentos().map(
  (department) => ({
    value: department.nombre,
    label: department.nombre,
  })
);

export function getColombiaCities(department: string): SearchableDropdownOption[] {
  return getMunicipios(department).map((city) => ({
    value: city.nombre,
    label: city.nombre,
  }));
}
