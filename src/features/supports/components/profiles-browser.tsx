"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CloudOff, FileSliders, RefreshCw } from "lucide-react";

import StatePanel from "@/shared/components/state-panel";
import { Button } from "@/shared/components/ui/button";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";
import { useBreadcrumbLabel } from "@/shared/store/use-breadcrumb-store";

import { useProfiles } from "../hooks/use-supports";
import { calcMethodLabel, choiceLabel, formatDay } from "../lib/format";
import type { SupportProfile } from "../types/support.types";
import BasePicker, { SUPPLIER_PICKER } from "./base-picker";

const profileHref = (area: string, code: string) => `/${area}/apoyos/perfiles/${encodeURIComponent(code)}`;

const text = (value: string | string[] | undefined) => (typeof value === "string" ? value : "");

function mappedFields(profile: SupportProfile): string {
  const count = Object.keys(profile.column_map).length;
  return count === 0 ? "Sin columnas propias" : count === 1 ? "1 columna propia" : `${count} columnas propias`;
}

/** Suppliers with a profile, and the way into a new one: choosing a supplier opens its editor. */
export default function ProfilesBrowser({ area }: { area: string }) {
  const router = useRouter();
  const profiles = useProfiles();
  useBreadcrumbLabel(`/${area}/apoyos/perfiles`, "Perfiles de proveedor");
  const items = profiles.data ?? [];

  return (
    <div className="space-y-4">
      <div className="max-w-md">
        <BasePicker
          config={{ ...SUPPLIER_PICKER, label: "Abrir o crear el perfil de un proveedor" }}
          selected={null}
          onSelect={(option) => router.push(profileHref(area, option.value))}
          onClear={() => undefined}
        />
      </div>

      {profiles.isPending ? (
        <div className="h-60 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando perfiles" />
      ) : profiles.isError ? (
        <StatePanel
          icon={CloudOff}
          tone="danger"
          title="No se pudieron cargar los perfiles"
          action={
            <Button variant="outline" onClick={() => profiles.refetch()}>
              <RefreshCw aria-hidden="true" /> Reintentar
            </Button>
          }
        >
          {errorMessage(profiles.error)}
        </StatePanel>
      ) : items.length === 0 ? (
        <StatePanel icon={FileSliders} title="Aún no hay perfiles de proveedor">
          Un perfil guarda los valores por defecto de un proveedor y los nombres de las columnas de su archivo.
          Elige un proveedor arriba para crear el primero.
        </StatePanel>
      ) : (
        <>
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface md:hidden">
            {items.map((profile) => (
              <li key={profile.supplier_code}>
                <Link
                  href={profileHref(area, profile.supplier_code)}
                  className="flex min-h-14 flex-col gap-0.5 px-3 py-2.5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                >
                  <span className="truncate text-sm font-medium">{profile.supplier_name}</span>
                  <span className="truncate text-xs text-text-secondary">
                    <span className="font-mono">{profile.supplier_code}</span> · {methodOf(profile)} · {mappedFields(profile)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto rounded-lg border border-border bg-surface md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
                <tr>
                  <th scope="col" className="px-3 py-2">Proveedor</th>
                  <th scope="col" className="px-3 py-2">Método de cálculo</th>
                  <th scope="col" className="px-3 py-2">Tipo</th>
                  <th scope="col" className="px-3 py-2">Archivo</th>
                  <th scope="col" className="px-3 py-2 text-right">Actualizado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((profile) => (
                  <tr key={profile.supplier_code} className="hover:bg-primary-subtle">
                    <td className="max-w-72 px-3 py-2">
                      <Link
                        href={profileHref(area, profile.supplier_code)}
                        className={cn(
                          "block truncate rounded-sm font-medium hover:underline",
                          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        )}
                      >
                        {profile.supplier_name}
                      </Link>
                      <span className="block font-mono text-xs text-text-secondary">{profile.supplier_code}</span>
                    </td>
                    <td className="px-3 py-2">{methodOf(profile)}</td>
                    <td className="px-3 py-2">{text(profile.defaults.kind) ? choiceLabel("kind", text(profile.defaults.kind)) : "Sin definir"}</td>
                    <td className="px-3 py-2">
                      <span className="block">{mappedFields(profile)}</span>
                      {profile.sheet && <span className="block text-xs text-text-secondary">Hoja {profile.sheet}</span>}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="block tabular-nums">{formatDay(profile.updated_at)}</span>
                      <span className="block text-xs text-text-secondary">{profile.updated_by}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function methodOf(profile: SupportProfile): string {
  const method = text(profile.defaults.calc_method);
  return method ? calcMethodLabel(method) : "Método sin definir";
}
