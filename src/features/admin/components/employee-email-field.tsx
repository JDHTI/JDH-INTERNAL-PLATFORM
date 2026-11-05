"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { listAdminEmployees } from "@/features/directory/services/directory.service";
import { Autocomplete } from "@/shared/components/ui/autocomplete";
import { COMPANY_EMAIL_DOMAIN } from "@/shared/config/general.config";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";

/**
 * A corporate email, typed or picked. Suggestions come from the whole
 * directory (hidden people included, since this is the admin panel), so any
 * of the company's accounts can be found by name or email. Whatever is typed
 * stays: the API resolves the email, and says so when the person is not
 * synced yet.
 */
export default function EmployeeEmailField({
  id,
  value,
  onChange,
  excludeEmails = [],
  placeholder = `nombre.apellido@${COMPANY_EMAIL_DOMAIN}`,
  disabled,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** Emails already in the list the field feeds, left out of the suggestions. */
  excludeEmails?: string[];
  placeholder?: string;
  disabled?: boolean;
  describedBy?: string;
}) {
  const q = useDebouncedValue(value.trim());
  const enabled = q.length >= 2;
  const { data, isFetching } = useQuery({
    queryKey: ["admin", "employee-search", q],
    queryFn: () =>
      listAdminEmployees({ q, includeHidden: true, includeInactive: false, page: 1, size: 8 }),
    enabled,
    staleTime: 60_000,
  });

  const options = useMemo(() => {
    const excluded = new Set(excludeEmails.map((email) => email.toLowerCase()));
    return (data?.items ?? [])
      .filter((employee) => employee.email && !excluded.has(employee.email.toLowerCase()))
      .map((employee) => ({
        value: employee.email as string,
        label: employee.full_name,
        hint: employee.email as string,
      }));
  }, [data, excludeEmails]);

  return (
    <Autocomplete
      id={id}
      type="email"
      inputMode="email"
      autoCapitalize="none"
      spellCheck={false}
      value={value}
      onValueChange={onChange}
      options={options}
      onSelect={(option) => onChange(option.value)}
      isLoading={enabled && isFetching}
      emptyText={enabled && !isFetching ? "Nadie en el directorio coincide. Puedes escribir el correo completo." : undefined}
      placeholder={placeholder}
      disabled={disabled}
      aria-describedby={describedBy}
    />
  );
}
