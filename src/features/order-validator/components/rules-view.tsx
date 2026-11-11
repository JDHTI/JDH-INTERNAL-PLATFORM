"use client";

import Link from "next/link";
import { ArrowLeft, BookX, CloudOff, RefreshCw } from "lucide-react";

import PageHeader from "@/shared/components/page-header";
import StatePanel from "@/shared/components/state-panel";
import { Button } from "@/shared/components/ui/button";
import { errorMessage } from "@/shared/lib/api-client";
import { useBreadcrumbLabel } from "@/shared/store/use-breadcrumb-store";
import { humanize } from "@/features/supports/lib/format";

import { useValidatorRules } from "../hooks/use-order-validator";
import { RULE_PARAMETER_LABELS } from "../lib/format";
import type { RuleSection, ValidatorRule } from "../types/order-validator.types";
import { RuleEffectBadge } from "./status-badges";

/**
 * The rules the validator applies, read for everyone who works with its
 * results. Everything comes from the API, values included, so the page never
 * states a number the system no longer uses. Sections and rules keep the
 * order in which they are applied, so each list is numbered.
 */
export default function RulesView({ basePath }: { basePath: string }) {
  const rules = useValidatorRules();
  useBreadcrumbLabel(`${basePath}/reglas`, "Reglas");

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Link
          href={basePath}
          className="inline-flex min-h-8 items-center gap-1 rounded-sm text-sm text-text-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:min-h-11"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Validador de pedidos
        </Link>
        <PageHeader
          title="Reglas del validador"
          description="Cómo decide el validador qué pedidos retenidos quedan listos para liberación y cuáles esperan a una persona, en el orden en que aplica cada regla y con los valores vigentes."
        />
      </div>

      {rules.isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3" aria-busy="true" aria-label="Cargando las reglas">
          {[0, 1, 2, 3, 4, 5].map((key) => (
            <div key={key} className="h-36 animate-pulse rounded-lg bg-canvas-subtle" />
          ))}
        </div>
      ) : rules.isError ? (
        <StatePanel
          icon={CloudOff}
          tone="danger"
          title="No se pudieron cargar las reglas"
          action={
            <Button variant="outline" onClick={() => rules.refetch()}>
              <RefreshCw aria-hidden="true" /> Reintentar
            </Button>
          }
        >
          {errorMessage(rules.error)}
        </StatePanel>
      ) : rules.data.length === 0 ? (
        <StatePanel icon={BookX} title="El validador no publicó reglas">
          Cuando el servicio las publique, aparecerán aquí.
        </StatePanel>
      ) : (
        rules.data.map((section) => <Section key={section.code} section={section} />)
      )}
    </div>
  );
}

/**
 * A section's rules as a grid of cards that fills the width: two columns from
 * tablet up, three on wide screens. The list stays ordered, so the numbers read
 * left to right, top to bottom, in the order the rules apply.
 */
function Section({ section }: { section: RuleSection }) {
  const headingId = `reglas-${section.code}`;
  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <h2 id={headingId} className="text-xl font-semibold tracking-tight">
        {section.title}
      </h2>
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

function Rule({ rule, step }: { rule: ValidatorRule; step: number }) {
  const parameters = Object.entries(rule.parameters);
  return (
    <article className="flex w-full gap-3 rounded-lg border border-border bg-surface px-4 py-3">
      <span className="w-5 shrink-0 pt-0.5 text-right text-sm tabular-nums text-text-secondary" aria-hidden="true">
        {step}.
      </span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="text-base font-semibold">{rule.title}</h3>
          <RuleEffectBadge effect={rule.effect} />
        </div>
        <p className="text-sm">{rule.description}</p>
        {parameters.length > 0 && (
          <dl className="flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
            {parameters.map(([key, value]) => (
              <div key={key} className="flex gap-1">
                <dt className="text-text-secondary">{RULE_PARAMETER_LABELS[key] ?? humanize(key)}:</dt>
                <dd className="font-medium tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </article>
  );
}
