"use client"

import * as React from "react"
import { ShieldCheck } from "lucide-react"

import { InitialsAvatar } from "@/intranet/components/common/initials-avatar"
import { Spinner } from "@/intranet/components/common/spinner"
import { StatusBadge } from "@/intranet/components/common/status-badge"
import { Tag } from "@/intranet/components/common/tag"
import { Breadcrumbs } from "@/intranet/components/navigation/breadcrumbs"
import { FilterChips } from "@/intranet/components/navigation/filter-chips"
import { FilterSelect } from "@/intranet/components/navigation/filter-select"
import { Pagination } from "@/intranet/components/navigation/pagination"

import { Section, Subsection } from "./section"

const REGIONS = [
  { value: "todas", label: "Todas", count: 42 },
  { value: "antioquia", label: "Antioquia", count: 18 },
  { value: "caribe", label: "Caribe", count: 12 },
  { value: "eje", label: "Eje cafetero", count: 12 },
] as const

const SEDES = [
  { value: "all", label: "Todas las sedes", count: 50 },
  { value: "itagui", label: "Centro administrativo Itagüí", count: 15 },
  { value: "bogota", label: "Bogotá", count: 13 },
  { value: "copacabana", label: "Bodega Copacabana", count: 12 },
  { value: "costa", label: "Costa", count: 10 },
] as const

const CATEGORIES = [
  { value: "politicas", label: "Políticas" },
  { value: "manuales", label: "Manuales" },
  { value: "formatos", label: "Formatos" },
] as const

export function DisplaySection() {
  const [region, setRegion] = React.useState<string>("todas")
  const [categories, setCategories] = React.useState<string[]>(["politicas"])
  const [page, setPage] = React.useState(3)
  const [sede, setSede] = React.useState<string>("all")

  const toggleCategory = (value: string) =>
    setCategories((current) =>
      current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
    )

  return (
    <Section
      title="Navegación y display"
      description="Chips de filtro, dropdown de filtro, paginación, breadcrumbs, tags, badges de estado, avatares y spinner."
    >
      <Subsection label="Filtros — selección única (radiogroup)">
        <FilterChips
          aria-label="Filtrar por región"
          options={REGIONS.map((r) => ({ ...r }))}
          value={region}
          onChange={setRegion}
        />
      </Subsection>

      <Subsection label="Filtros — selección múltiple">
        <FilterChips
          multiple
          aria-label="Filtrar por categoría"
          options={CATEGORIES.map((c) => ({ ...c }))}
          value={categories}
          onChange={toggleCategory}
        />
      </Subsection>

      <Subsection label="Dropdown de filtro (sedes)">
        <FilterSelect
          label="Filtrar por sede"
          options={SEDES.map((s) => ({ ...s }))}
          value={sede}
          onChange={setSede}
        />
      </Subsection>

      <Subsection label="Paginación">
        <Pagination page={page} totalPages={12} onPageChange={setPage} />
      </Subsection>

      <Subsection label="Breadcrumbs">
        <Breadcrumbs
          items={[
            { label: "Inicio", href: "/" },
            { label: "SIG", href: "/sig" },
            { label: "Política de seguridad" },
          ]}
        />
      </Subsection>

      <Subsection label="Tags · badges de estado">
        <div className="flex flex-wrap items-center gap-3">
          <Tag>Seguridad</Tag>
          <Tag>
            <ShieldCheck />
            Verificado
          </Tag>
          <StatusBadge variant="dot">Activo</StatusBadge>
          <StatusBadge variant="count">3</StatusBadge>
          <StatusBadge variant="region">Antioquia</StatusBadge>
        </div>
      </Subsection>

      <Subsection label="Avatares (32 / 36 / 48 / 96) · spinner">
        <div className="flex flex-wrap items-center gap-4">
          <InitialsAvatar name="Ana Restrepo" size="sm" />
          <InitialsAvatar name="Carlos Muñoz" size="md" />
          <InitialsAvatar name="Diana Gómez" size="lg" tone="ink" />
          <InitialsAvatar name="Esteban Ríos" size="xl" />
          <InitialsAvatar name="Laura Ospina" size="lg" birthday />
          <Spinner />
        </div>
      </Subsection>
    </Section>
  )
}
