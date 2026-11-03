"use client";

import Link from "next/link";
import { ArrowLeft, BookX } from "lucide-react";

import StatePanel from "@/shared/components/state-panel";
import { Badge, type BadgeTone } from "@/shared/components/ui/badge";
import { useBreadcrumbLabel } from "@/shared/store/use-breadcrumb-store";
import { humanize } from "@/features/supports/lib/format";

import { useQuotationRules } from "../hooks/use-quotations";
import type { QuotationRule, QuotationRuleSection } from "../types/quotations.types";
import { QuotationLoadError } from "./quotations-gate";

/** Same vocabulary as the validator's rules; an effect the UI does not know yet prints readable and neutral. */
const EFFECT_LOOK: Record<string, { tone: BadgeTone; label: string }> = {
  retiene: { tone: "danger", label: "Retiene" },
  alerta: { tone: "warning", label: "Alerta" },
  libera: { tone: "success", label: "Libera" },
  informa: { tone: "neutral", label: "Informa" },
};

/** Names for the keys of a rule's `parameters`; the values always come from the API. */
const PARAMETER_LABELS: Record<string, string> = {
  puntos_maximos: "Puntos máximos bajo el objetivo",
};

/**
 * How the cotizador computes margins and what it lets through, with the values
 * in force. Everything comes from the API, so the page never states a number
 * the system no longer uses. Open to everyone, not only the commercial area.
 */
export default function QuotationRulesView({ basePath }: { basePath: string }) {
  const rules = useQuotationRules();
  useBreadcrumbLabel(`${basePath}/reglas`, "Reglas");

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Link
          href={basePath}
          className="inline-flex min-h-8 items-center gap-1 rounded-sm text-sm text-text-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:min-h-11"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Cotizador
        </Link>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Reglas del cotizador</h1>
          <p className="max-w-prose text-sm text-text-secondary">
            De dónde sale cada número de una cotización y qué precio nuevo deja generar el formato de SIESA, con los
            valores vigentes.
          </p>
        </div>
      </div>

      {rules.isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3" aria-busy="true" aria-label="Cargando las reglas">
          {[0, 1, 2, 3].map((key) => (
            <div key={key} className="h-36 animate-pulse rounded-lg bg-canvas-subtle" />
          ))}
        </div>
      ) : rules.isError ? (
        <QuotationLoadError error={rules.error} onRetry={() => void rules.refetch()} subject="las reglas" />
      ) : rules.data.length === 0 ? (
        <StatePanel icon={BookX} title="El cotizador no publicó reglas">
          Cuando el servicio las publique, aparecerán aquí.
        </StatePanel>
      ) : (
        rules.data.map((section) => <Section key={section.code} section={section} />)
      )}
    </div>
  );
}

function Section({ section }: { section: QuotationRuleSection }) {
  const headingId = `reglas-${section.code}`;
  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <h2 id={headingId} className="text-xl font-semibold tracking-tight">{section.title}</h2>
      <ol className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
        {section.rules.map((rule, index) => (
          <li key={rule.code} className="flex">
            <Rule rule={rule} step={index + 1} />
          </li>
        ))}
      </ol>
    </section>
  );
}

function Rule({ rule, step }: { rule: QuotationRule; step: number }) {
  const parameters = Object.entries(rule.parameters ?? {});
  const look = EFFECT_LOOK[rule.effect] ?? { tone: "neutral" as BadgeTone, label: humanize(rule.effect) };
  return (
    <article className="flex w-full gap-3 rounded-lg border border-border bg-surface px-4 py-3">
      <span className="w-5 shrink-0 pt-0.5 text-right text-sm tabular-nums text-text-secondary" aria-hidden="true">{step}.</span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="text-base font-semibold">{rule.title}</h3>
          <Badge tone={look.tone}>{look.label}</Badge>
        </div>
        <p className="text-sm">{rule.description}</p>
        {parameters.length > 0 && (
          <dl className="flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
            {parameters.map(([key, value]) => (
              <div key={key} className="flex gap-1">
                <dt className="text-text-secondary">{PARAMETER_LABELS[key] ?? humanize(key)}:</dt>
                <dd className="font-medium tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </article>
  );
}
