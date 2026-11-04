"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CloudOff } from "lucide-react";

import SessionRequired from "@/features/areas/components/session-required";
import StatePanel from "@/shared/components/state-panel";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import { ApiError, errorMessage } from "@/shared/lib/api-client";
import { formatIso } from "@/shared/lib/iso-date";

import { useEmployee, useTeam } from "../hooks/use-directory";
import { employeePosition, formatDayMonth } from "../types/directory.types";
import EmployeeAvatar from "./employee-avatar";

export default function EmployeeProfile({ employeeId }: { employeeId: string }) {
  const employee = useEmployee(employeeId);

  if (employee.isPending) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Cargando el perfil">
        <div className="flex items-center gap-4">
          <div className="size-24 animate-pulse rounded-md bg-canvas-subtle" />
          <div className="space-y-2">
            <div className="h-7 w-64 max-w-full animate-pulse rounded-md bg-canvas-subtle" />
            <div className="h-4 w-40 animate-pulse rounded-sm bg-canvas-subtle" />
          </div>
        </div>
        <div className="h-40 animate-pulse rounded-lg bg-canvas-subtle" />
      </div>
    );
  }

  if (employee.error instanceof ApiError && employee.error.status === 404) notFound();
  if (employee.error instanceof ApiError && employee.error.status === 401) {
    return <SessionRequired message={employee.error.detail} />;
  }
  if (employee.isError) {
    return (
      <StatePanel
        icon={CloudOff}
        title="No se pudo cargar el perfil"
        tone="danger"
        action={
          <Button variant="outline" onClick={() => employee.refetch()}>
            Reintentar
          </Button>
        }
      >
        {errorMessage(employee.error)}
      </StatePanel>
    );
  }

  const person = employee.data;
  const birthday =
    person.birth_day && person.birth_month
      ? formatDayMonth(person.birth_day, person.birth_month)
      : null;

  const facts: { label: string; value: React.ReactNode }[] = [
    {
      label: "Correo",
      value: person.email ? (
        <a
          href={`mailto:${person.email}`}
          className="break-all underline underline-offset-2 hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {person.email}
        </a>
      ) : (
        "Sin correo"
      ),
    },
    { label: "Departamento", value: person.department ?? "Sin departamento" },
    { label: "Sede", value: person.site?.name ?? "Sin sede asignada" },
    {
      label: "Jefe inmediato",
      value: person.manager ? (
        <Link
          href={`/directorio/${person.manager.id}`}
          className="underline underline-offset-2 hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {person.manager.full_name}
        </Link>
      ) : (
        "Sin jefe registrado"
      ),
    },
    { label: "Ingreso", value: person.hire_date ? formatIso(person.hire_date) : "Sin fecha registrada" },
    { label: "Cumpleaños", value: birthday ?? "Sin fecha registrada" },
  ];

  return (
    <div className="space-y-8">
      <Link href="/directorio" className={buttonVariants({ variant: "ghost", size: "sm" })}>
        <ArrowLeft aria-hidden="true" />
        Directorio
      </Link>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <EmployeeAvatar employee={person} size="lg" />
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight break-words">{person.full_name}</h1>
          <p className="text-base text-text-secondary">{employeePosition(person)}</p>
          {person.is_manager && (
            <p className="text-sm text-text-secondary">Tiene personas a cargo</p>
          )}
        </div>
      </header>

      <dl className="grid gap-x-8 gap-y-4 rounded-lg border border-border p-4 sm:grid-cols-2 lg:grid-cols-3">
        {facts.map((fact) => (
          <div key={fact.label} className="min-w-0 space-y-0.5">
            <dt className="text-[13px] text-text-secondary">{fact.label}</dt>
            <dd className="text-sm">{fact.value}</dd>
          </div>
        ))}
      </dl>

      <Team employeeId={person.id} department={person.department} />
    </div>
  );
}

function Team({ employeeId, department }: { employeeId: string; department: string | null }) {
  const team = useTeam(employeeId);
  if (!department) return null;

  const items = (team.data?.items ?? []).filter((item) => item.id !== employeeId);

  return (
    <section aria-labelledby="team-heading" className="space-y-3">
      <h2 id="team-heading" className="text-base font-semibold">
        También en {department}
      </h2>
      {team.isPending ? (
        <div className="h-16 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" />
      ) : team.isError ? (
        <p className="text-sm text-text-secondary">{errorMessage(team.error)}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-text-secondary">Nadie más del departamento está en el directorio.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((mate) => (
            <li key={mate.id}>
              <Link
                href={`/directorio/${mate.id}`}
                className="flex min-h-14 items-center gap-3 rounded-lg border border-border p-2 transition-colors duration-150 hover:bg-canvas-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <EmployeeAvatar employee={mate} size="md" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{mate.full_name}</span>
                  <span className="block truncate text-xs text-text-secondary">{employeePosition(mate)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
