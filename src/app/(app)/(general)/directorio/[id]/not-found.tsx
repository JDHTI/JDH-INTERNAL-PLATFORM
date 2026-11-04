import Link from "next/link";
import { UserRoundX } from "lucide-react";

import StatePanel from "@/shared/components/state-panel";
import { buttonVariants } from "@/shared/components/ui/button";

export default function EmployeeNotFound() {
  return (
    <StatePanel
      icon={UserRoundX}
      title="Esta persona no está en el directorio"
      action={
        <Link href="/directorio" className={buttonVariants({ variant: "outline" })}>
          Volver al directorio
        </Link>
      }
    >
      Puede que ya no trabaje en la compañía o que su perfil esté oculto. Búscala por nombre en el directorio.
    </StatePanel>
  );
}
