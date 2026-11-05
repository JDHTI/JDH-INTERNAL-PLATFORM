import Link from "next/link";
import { MapPinOff } from "lucide-react";

import StatePanel from "@/shared/components/state-panel";
import { buttonVariants } from "@/shared/components/ui/button";

export default function NotFound() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Página no encontrada
      </h1>
      <StatePanel
        icon={MapPinOff}
        title="Esta dirección no existe en la plataforma"
        action={
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            Ir al inicio
          </Link>
        }
      >
        Puede que el área o el módulo haya cambiado de nombre, o que el enlace
        esté incompleto.
      </StatePanel>
    </div>
  );
}
