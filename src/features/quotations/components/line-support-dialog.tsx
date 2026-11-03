"use client";

import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogFooter } from "@/shared/components/ui/dialog";
import { calcMethodLabel, choiceLabel } from "@/features/supports/lib/format";

import { formatDay, formatMargin, formatMoney } from "../lib/format";
import type { QuotationLine } from "../types/quotations.types";

/**
 * Why a line carries the support it does: the one applied, with its amount
 * per inventory unit, and those that would cover it but were not applied.
 * The full agreement opens in the supports master's own detail.
 */
export default function LineSupportDialog({
  line,
  onClose,
  onOpenAgreement,
}: {
  line: QuotationLine | null;
  onClose: () => void;
  onOpenAgreement: (supportId: string) => void;
}) {
  const support = line?.support ?? null;
  return (
    <Dialog
      open={line !== null}
      onOpenChange={(open) => !open && onClose()}
      title={line ? `Apoyo de ${line.sku}` : "Apoyo"}
      description={line?.description ?? undefined}
    >
      {line && (
        <div className="space-y-5 text-sm">
          {support ? (
            <section aria-labelledby="applied-support" className="space-y-2">
              <h3 id="applied-support" className="text-base font-semibold">Aplicado</h3>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
                <Row label="Tipo">{support.kind ? choiceLabel("kind", support.kind) : "—"}</Row>
                <Row label="Programa">{support.program ?? "—"}</Row>
                <Row label="Cálculo">{calcMethodLabel(support.calc_method)}</Row>
                <Row label="Por unidad"><span className="tabular-nums">{formatMoney(support.amount)}</span></Row>
                <Row label="Sobre el costo"><span className="tabular-nums">{formatMargin(support.share_of_cost)}</span></Row>
                {support.required_margin_pct !== null && (
                  <Row label="Margen que exige"><span className="tabular-nums">{formatMargin(support.required_margin_pct)}</span></Row>
                )}
                <Row label="Vigencia">
                  {formatDay(support.valid_from)} a {support.valid_to ? formatDay(support.valid_to) : "sin fin"}
                </Row>
                {support.conditions && <Row label="Condiciones">{support.conditions}</Row>}
                {support.detail && <Row label="Detalle">{support.detail}</Row>}
                {support.needs_review && <Row label="Estado">En revisión con el proveedor</Row>}
              </dl>
            </section>
          ) : (
            <p>Ningún apoyo se aplicó a esta referencia.</p>
          )}

          {line.support_candidates.length > 0 && (
            <section aria-labelledby="support-candidates" className="space-y-2">
              <h3 id="support-candidates" className="text-base font-semibold">Cubren la referencia, sin aplicar</h3>
              <ul className="divide-y divide-border rounded-md border border-border">
                {line.support_candidates.map((candidate) => (
                  <li key={candidate.support_id} className="space-y-0.5 px-3 py-2">
                    <p className="font-medium">
                      {candidate.program ?? "Sin programa"}
                      <span className="font-normal text-text-secondary"> · {calcMethodLabel(candidate.calc_method)}</span>
                    </p>
                    <p className="text-text-secondary">{candidate.reason}</p>
                    <Button variant="ghost" size="sm" className="-ml-2.5 max-md:h-11" onClick={() => onOpenAgreement(candidate.support_id)}>
                      Ver el apoyo
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={onClose} className="max-md:h-11">Cerrar</Button>
            {support && (
              <Button onClick={() => onOpenAgreement(support.support_id)} className="max-md:h-11">
                Ver el apoyo completo
              </Button>
            )}
          </DialogFooter>
        </div>
      )}
    </Dialog>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-text-secondary">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </>
  );
}
