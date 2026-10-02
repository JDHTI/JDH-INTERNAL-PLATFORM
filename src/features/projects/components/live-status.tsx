import { Radio, WifiOff } from "lucide-react";

import { LOGIN_URL } from "@/shared/lib/api-client";

import type { LiveStatus as Status } from "../types/project.types";

/**
 * Whether other people's changes are arriving. It matters because the
 * screen looks the same either way: without this line, a dropped
 * connection reads as "nobody changed anything".
 */
export default function LiveStatus({ status }: { status: Status }) {
  if (status === "live") {
    return (
      <span className="flex items-center gap-1.5 text-[13px] text-text-secondary">
        <Radio className="size-4 text-success" aria-hidden="true" />
        Cambios en vivo
      </span>
    );
  }

  if (status === "connecting") {
    return (
      <span role="status" className="flex items-center gap-1.5 text-[13px] text-text-secondary">
        <Radio className="size-4" aria-hidden="true" />
        Conectando con los cambios en vivo
      </span>
    );
  }

  return (
    <span role="status" className="flex items-center gap-1.5 text-[13px] text-warning">
      <WifiOff className="size-4" aria-hidden="true" />
      {status === "unauthenticated" ? (
        <>
          Tu sesión venció y dejaste de ver cambios en vivo.{" "}
          <a href={LOGIN_URL} className="font-medium underline underline-offset-2">
            Iniciar sesión
          </a>
        </>
      ) : (
        "Sin cambios en vivo: recarga la página para ver lo último."
      )}
    </span>
  );
}
