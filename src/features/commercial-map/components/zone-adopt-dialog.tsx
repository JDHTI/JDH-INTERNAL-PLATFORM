"use client";

import { useMemo, useState } from "react";

import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Field } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { errorMessage } from "@/shared/lib/api-client";

import { useAdoptZones, useZones } from "../hooks/use-commercial-map";
import { ZONE_LEVEL_LABEL } from "../lib/format";
import type { PaletteKey, ZoneFeature } from "../types/commercial-map.types";
import ColorSwatches from "./color-swatches";

/**
 * A commercial zone made of official ones: «Laureles» is commune 11,
 * «Envigado» the municipality. The official layer is loaded by TI, once.
 */
export default function ZoneAdoptDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (zone: ZoneFeature) => void;
}) {
  const official = useZones("official", open);
  const adopt = useAdoptZones();
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [color, setColor] = useState<PaletteKey>("blue");
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<string[]>([]);

  const zones = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es");
    return (official.data?.features ?? [])
      .filter((zone) => term === "" || zone.properties.name.toLocaleLowerCase("es").includes(term))
      .sort((a, b) => a.properties.name.localeCompare(b.properties.name, "es"));
  }, [official.data, search]);

  const close = (next: boolean) => {
    if (!next) {
      setName("");
      setNameError(null);
      setSearch("");
      setPicked([]);
      adopt.reset();
    }
    onOpenChange(next);
  };
  const toggle = (id: string) =>
    setPicked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  const none = official.isSuccess && official.data.features.length === 0;

  return (
    <Dialog
      open={open}
      onOpenChange={close}
      title="Crear una zona con zonas oficiales"
      description="Elige los municipios, comunas o barrios que forman la zona comercial. Se unen en una sola."
      isForm
    >
      {official.isPending ? (
        <div className="h-40 animate-pulse rounded-md bg-canvas-subtle" aria-busy="true">
          <span className="sr-only">Cargando las zonas oficiales</span>
        </div>
      ) : official.isError ? (
        <>
          <DialogError message={errorMessage(official.error)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => void official.refetch()}>
              Reintentar
            </Button>
          </DialogFooter>
        </>
      ) : none ? (
        <>
          <p className="text-sm text-text-secondary">
            Todavía no hay zonas oficiales cargadas. TI las carga una vez (municipios del DANE, comunas y barrios de
            Medellín). Mientras tanto puedes dibujar la zona a mano con «Dibujar una zona».
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => close(false)}>
              Entendido
            </Button>
          </DialogFooter>
        </>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim() === "") {
              setNameError("Escribe el nombre de la zona, por ejemplo Laureles.");
              return;
            }
            adopt.mutate(
              { name: name.trim(), color, official_zone_ids: picked },
              {
                onSuccess: (zone) => {
                  onCreated(zone);
                  close(false);
                },
              }
            );
          }}
        >
          <Field label="Nombre de la zona" htmlFor="adopt-name" error={nameError}>
            <Input
              id="adopt-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onBlur={() => setNameError(name.trim() === "" ? "Escribe el nombre de la zona, por ejemplo Laureles." : null)}
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? "adopt-name-error" : undefined}
              maxLength={80}
              className="max-md:h-11"
            />
          </Field>

          <div className="space-y-1.5">
            <span id="adopt-color" className="block text-[13px] font-medium">
              Color
            </span>
            <ColorSwatches value={color} onChange={setColor} labelledBy="adopt-color" />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-[13px] font-medium">Zonas oficiales que la forman</legend>
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre"
              aria-label="Buscar zonas oficiales por nombre"
              className="max-md:h-11"
            />
            <ul className="max-h-60 divide-y divide-border overflow-y-auto rounded-md border border-border">
              {zones.map((zone) => (
                <li key={zone.properties.id}>
                  <label className="flex min-h-10 cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-primary-subtle max-md:min-h-11">
                    <input
                      type="checkbox"
                      checked={picked.includes(zone.properties.id)}
                      onChange={() => toggle(zone.properties.id)}
                      className="size-4 accent-[var(--primary)]"
                    />
                    <span className="min-w-0 flex-1 truncate">{zone.properties.name}</span>
                    <span className="text-[13px] text-text-secondary">{ZONE_LEVEL_LABEL[zone.properties.level]}</span>
                  </label>
                </li>
              ))}
              {zones.length === 0 && (
                <li className="px-3 py-3 text-sm text-text-secondary">Ninguna zona oficial coincide con la búsqueda.</li>
              )}
            </ul>
            <p className="text-[13px] text-text-secondary" aria-live="polite">
              {picked.length === 0
                ? "Elige al menos una."
                : picked.length === 1
                  ? "1 zona elegida."
                  : `${picked.length} zonas elegidas.`}
            </p>
          </fieldset>

          <DialogError message={adopt.isError ? errorMessage(adopt.error) : null} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => close(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={picked.length === 0 || adopt.isPending}>
              Crear la zona
            </Button>
          </DialogFooter>
        </form>
      )}
    </Dialog>
  );
}
