"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import { Button } from "@/shared/components/ui/button";

import { formatDate } from "../lib/format";
import { pickupOrderText, ROUTE_LABELS } from "../lib/pickup-order";
import type { PqrsfCase } from "../types/pqrsf.types";
import { EditFollowUpDialog } from "./case-dialogs";

/**
 * What the case is about, as the customer classified it, and the follow-up
 * of its products. The subject and cause change only by reclassifying; the
 * pickup order and the delivery date are completed here.
 */
export default function CaseClassification({ item }: { item: PqrsfCase }) {
  const [isEditing, setEditing] = useState(false);
  const classification = item.classification;
  if (!classification) return null;

  const hasProducts = (item.products ?? []).length > 0;
  const facts: [string, string | null][] = [
    ["Área elegida", classification.requested_area?.name ?? null],
    ["Asunto", classification.subject?.name ?? null],
    ["Causal", classification.cause?.name ?? null],
    ["Ruta", classification.route ? ROUTE_LABELS[classification.route] : null],
  ];
  const followUp: [string, string | null][] = [
    [
      "Orden de recogida",
      pickupOrderText(classification.pickup_order_requested, classification.pickup_order_number) ||
        null,
    ],
    [
      "Fecha de entrega",
      classification.delivery_date ? formatDate(classification.delivery_date) : null,
    ],
  ];
  const isClassified = facts.some(([, value]) => value);
  const hasFollowUp = followUp.some(([, value]) => value);
  // A case without classification or products has nothing to show here.
  if (!isClassified && !hasFollowUp && !hasProducts) return null;
  const canEdit = item.permissions.can_work && item.closed_at === null;

  return (
    <section aria-labelledby="classification-heading" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="classification-heading" className="text-base font-semibold">
          Clasificación
        </h2>
        {canEdit && (hasProducts || hasFollowUp) && (
          <Button
            variant="outline"
            size="sm"
            className="max-md:h-11"
            onClick={() => setEditing(true)}
          >
            <Pencil aria-hidden="true" />
            Orden de recogida y entrega
          </Button>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border border-border p-4 text-sm lg:grid-cols-3">
        {[...facts, ...(hasProducts || hasFollowUp ? followUp : [])].map(([label, value]) => (
          <div key={label} className="min-w-0 space-y-0.5">
            <dt className="text-[13px] text-text-secondary">{label}</dt>
            <dd className="break-words">
              {value ?? <span className="text-text-secondary">Sin dato</span>}
            </dd>
          </div>
        ))}
      </dl>
      {isEditing && <EditFollowUpDialog item={item} onOpenChange={setEditing} />}
    </section>
  );
}
