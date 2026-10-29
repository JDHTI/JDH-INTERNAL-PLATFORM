"use client";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogFooter } from "@/shared/components/ui/dialog";

export default function DiscardDialog({ open, onCancel, onDiscard }: { open: boolean; onCancel: () => void; onDiscard: () => void }) {
  return <Dialog open={open} onOpenChange={next => { if (!next) onCancel(); }} title="¿Descartar los cambios?" description="Los valores sin enviar se perderán. No se modificará ningún acuerdo ni solicitud." isForm>
    <DialogFooter><Button variant="outline" onClick={onCancel}>Seguir editando</Button><Button onClick={onDiscard}>Descartar cambios</Button></DialogFooter>
  </Dialog>;
}
