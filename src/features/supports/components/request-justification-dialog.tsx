"use client";
import { Dialog } from "@/shared/components/ui/dialog";
import { requestSupplier } from "../lib/request-label";
import type { SupportRequest } from "../types/request.types";

export default function RequestJustificationDialog({ request, onClose }: { request: SupportRequest; onClose: () => void }) {
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }} title="Justificación de la solicitud" description={`Apoyo JDH · ${requestSupplier(request)}`} wide>
    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{request.reason}</p>
  </Dialog>;
}
