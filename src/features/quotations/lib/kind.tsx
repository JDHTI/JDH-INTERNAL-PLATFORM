"use client";

import { createContext, useContext } from "react";

import type { QuotationKind } from "../types/quotations.types";

/**
 * The quoter and the list updates share the screens. The page says which one
 * it is; the permissions, the listing and the copy follow it. A quotation that
 * is opened carries its own `kind`, which wins inside the editor.
 */
const KindContext = createContext<QuotationKind>("cotizacion");

export function QuotationKindProvider({ kind, children }: { kind: QuotationKind; children: React.ReactNode }) {
  return <KindContext.Provider value={kind}>{children}</KindContext.Provider>;
}

export function useQuotationKind(): QuotationKind {
  return useContext(KindContext);
}

/** The words that change between the two modules. */
export const KIND_COPY: Record<
  QuotationKind,
  {
    /** "la cotización" / "la actualización". */
    one: string;
    /** "las cotizaciones" / "las actualizaciones". */
    many: string;
    module: string;
    /** The price each line is compared against. */
    basePrice: string;
    create: string;
  }
> = {
  cotizacion: {
    one: "la cotización",
    many: "las cotizaciones",
    module: "el cotizador",
    basePrice: "Último precio",
    create: "Nueva cotización",
  },
  lista: {
    one: "la actualización",
    many: "las actualizaciones",
    module: "la actualización de listas",
    basePrice: "Precio actual",
    create: "Nueva actualización",
  },
};
