import { LogIn } from "lucide-react";

import StatePanel from "@/shared/components/state-panel";
import { buttonVariants } from "@/shared/components/ui/button";
import { LOGIN_URL } from "@/shared/lib/api-client";

/**
 * 401 screen. The fix is signing in, not retrying, so the action is a real
 * link to the API's SSO entry point (a full navigation, since it redirects to
 * Microsoft and back).
 */
export default function SessionRequired({ message }: { message: string }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Inicia sesión</h1>
      <StatePanel
        icon={LogIn}
        title={message}
        action={
          <a href={LOGIN_URL} className={buttonVariants({ variant: "primary" })}>
            Iniciar sesión con Microsoft
          </a>
        }
      >
        Entras con tu cuenta corporativa de Microsoft; la plataforma no guarda
        contraseñas.
      </StatePanel>
    </div>
  );
}
