"use client";

import Link from "next/link";
import { CloudOff, UserPlus } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { errorMessage } from "@/shared/lib/api-client";
import { formatIso, toDate } from "@/shared/lib/iso-date";

import { useNewHires } from "../hooks/use-directory";
import { employeePosition } from "../types/directory.types";
import EmployeeAvatar from "./employee-avatar";

const relative = new Intl.RelativeTimeFormat("es-CO", { numeric: "auto" });

function sinceHire(iso: string): string {
  const start = toDate(iso);
  if (!start) return formatIso(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((start.getTime() - today.getTime()) / 86_400_000);
  if (days > -31) return relative.format(days, "day");
  return relative.format(Math.round(days / 30), "month");
}

export default function NewHires() {
  const hires = useNewHires(6);
  const items = hires.data?.items ?? [];

  return (
    <section aria-labelledby="new-hires-heading" className="space-y-3 rounded-lg border border-border p-4">
      <h2 id="new-hires-heading" className="text-base font-semibold">
        Nuevos integrantes
      </h2>

      {hires.isPending ? (
        <div className="space-y-2" aria-busy="true" aria-label="Cargando nuevos integrantes">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-12 animate-pulse rounded-md bg-canvas-subtle" />
          ))}
        </div>
      ) : hires.isError ? (
        <div className="flex flex-col items-start gap-2 text-sm text-text-secondary" role="alert">
          <span className="flex items-center gap-2">
            <CloudOff className="size-4 text-danger" aria-hidden="true" />
            {errorMessage(hires.error)}
          </span>
          <Button variant="outline" size="sm" onClick={() => hires.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : items.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-text-secondary">
          <UserPlus className="size-4" aria-hidden="true" />
          Todavía no hay fechas de ingreso en el directorio.
        </p>
      ) : (
        <ul className="space-y-1">
          {items.map((person) => (
            <li key={person.id}>
              <Link
                href={`/directorio/${person.id}`}
                className="flex min-h-12 items-center gap-2.5 rounded-sm px-1 hover:bg-canvas-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <EmployeeAvatar employee={person} size="md" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{person.full_name}</span>
                  <span className="block truncate text-xs text-text-secondary">
                    {employeePosition(person)}
                  </span>
                </span>
                <time
                  dateTime={person.hire_date}
                  title={formatIso(person.hire_date)}
                  className="shrink-0 text-xs text-text-secondary"
                >
                  {sinceHire(person.hire_date)}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
