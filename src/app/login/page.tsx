import { LogIn } from "lucide-react";

import StatePanel from "@/shared/components/state-panel";
import { buttonVariants } from "@/shared/components/ui/button";
import { LOGIN_URL } from "@/shared/lib/api-client";

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-8 text-text-primary">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-text-secondary">
            JDH
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Inicia sesión</h1>
        </div>
        <StatePanel
          icon={LogIn}
          title="Accede con tu cuenta corporativa"
          action={
            <a href={LOGIN_URL} className={buttonVariants({ variant: "primary" })}>
              Iniciar sesión con Microsoft
            </a>
          }
        >
          La plataforma usa la sesión corporativa de Microsoft y no guarda contraseñas.
        </StatePanel>
      </div>
    </main>
  );
}
