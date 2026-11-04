"use client"

import * as React from "react"
import { toast } from "sonner"

import { SearchInput } from "@/intranet/components/forms/search-input"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/intranet/components/ui/tooltip"
import { iconCatalog } from "@/intranet/config/icons.config"

import { Section } from "./section"

export function IconsSection() {
  const [query, setQuery] = React.useState("")
  const q = query.trim().toLowerCase()

  const filtered = q
    ? iconCatalog.filter(
        (entry) =>
          entry.name.toLowerCase().includes(q) ||
          entry.tags.some((tag) => tag.includes(q))
      )
    : iconCatalog

  const copy = (name: string) => {
    navigator.clipboard.writeText(name)
    toast.success(`Copiado: ${name}`)
  }

  return (
    <Section
      title="Iconos"
      description={`Set curado de ${iconCatalog.length} iconos (lucide-react). Clic para copiar el nombre.`}
    >
      <div className="max-w-sm">
        <SearchInput
          placeholder="Buscar icono…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin resultados.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {filtered.map(({ name, icon: Icon }) => (
            <Tooltip key={name}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => copy(name)}
                  className="flex flex-col items-center gap-2 rounded-md border border-border p-3 text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Icon className="size-5" />
                  <span className="w-full truncate text-center text-[0.6875rem]">
                    {name}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent>{name}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      )}
    </Section>
  )
}
