"use client";

import { useState } from "react";
import Link from "next/link";
import { Cake, ChevronLeft, ChevronRight, CloudOff } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import { useBirthdays } from "../hooks/use-directory";
import { MONTH_NAMES, employeePosition, type BirthdaySummary } from "../types/directory.types";
import EmployeeAvatar from "./employee-avatar";

/** Birthdays of a month, grouped by day, with today's group marked. */
export default function BirthdaysPanel() {
  const today = new Date();
  const thisMonth = today.getMonth() + 1;
  const [month, setMonth] = useState(thisMonth);
  const birthdays = useBirthdays(month);

  const shift = (step: 1 | -1) => setMonth((current) => ((current - 1 + step + 12) % 12) + 1);

  const byDay = new Map<number, BirthdaySummary[]>();
  for (const person of birthdays.data?.items ?? []) {
    byDay.set(person.birth_day, [...(byDay.get(person.birth_day) ?? []), person]);
  }
  const isToday = (day: number) => month === thisMonth && day === today.getDate();

  return (
    <section aria-labelledby="birthdays-heading" className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id="birthdays-heading" className="text-base font-semibold">
          Cumpleaños de {MONTH_NAMES[month - 1]}
        </h2>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => shift(-1)} aria-label="Mes anterior">
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => shift(1)} aria-label="Mes siguiente">
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>

      {birthdays.isPending ? (
        <div className="space-y-2" aria-busy="true" aria-label="Cargando cumpleaños">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-12 animate-pulse rounded-md bg-canvas-subtle" />
          ))}
        </div>
      ) : birthdays.isError ? (
        <div className="flex flex-col items-start gap-2 text-sm text-text-secondary" role="alert">
          <span className="flex items-center gap-2">
            <CloudOff className="size-4 text-danger" aria-hidden="true" />
            {errorMessage(birthdays.error)}
          </span>
          <Button variant="outline" size="sm" onClick={() => birthdays.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : byDay.size === 0 ? (
        <p className="flex items-center gap-2 text-sm text-text-secondary">
          <Cake className="size-4" aria-hidden="true" />
          Nadie del directorio cumple años en {MONTH_NAMES[month - 1]}.
        </p>
      ) : (
        <ol className="max-h-96 space-y-1 overflow-y-auto overscroll-contain">
          {[...byDay.entries()].map(([day, people]) => (
            <li
              key={day}
              className={cn(
                "flex gap-3 rounded-md px-2 py-1.5",
                isToday(day) && "bg-primary-subtle"
              )}
            >
              <span className="w-10 shrink-0 pt-2 text-sm font-semibold tabular-nums">
                {day}
                {isToday(day) && <span className="block text-[11px] font-medium">Hoy</span>}
              </span>
              <ul className="min-w-0 flex-1 space-y-1">
                {people.map((person) => (
                  <li key={person.id}>
                    <Link
                      href={`/directorio/${person.id}`}
                      className="flex min-h-11 items-center gap-2.5 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      <EmployeeAvatar employee={person} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{person.full_name}</span>
                        <span className="block truncate text-xs text-text-secondary">
                          {employeePosition(person)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
