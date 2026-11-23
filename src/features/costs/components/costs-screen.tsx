"use client";

import PriceIncreaseAnalysisView from "@/features/commercial-masters/components/price-increase-analysis-view";
import PriceIncreasesView from "@/features/commercial-masters/components/price-increases-view";

import CostsAccess from "./costs-access";
import EntriesView from "./entries-view";
import NoveltiesView from "./novelties-view";

export type CostsView = "entries" | "novelties" | "ledger" | "ledger-analysis";

/**
 * The client side of each Costos page: the permission check of its key, then
 * its view. The increase ledger reuses the masters' history and analysis; its
 * endpoints answer `can_manage` for either key.
 */
export default function CostsScreen({ view }: { view: CostsView }) {
  switch (view) {
    case "entries":
      return <CostsAccess module="analisis-entradas">{(permissions) => <EntriesView permissions={permissions} />}</CostsAccess>;
    case "novelties":
      return <CostsAccess module="novedades-compras">{(permissions) => <NoveltiesView permissions={permissions} />}</CostsAccess>;
    case "ledger":
      return <CostsAccess module="acumulado-alzas">{() => <PriceIncreasesView />}</CostsAccess>;
    case "ledger-analysis":
      return <CostsAccess module="acumulado-alzas">{() => <PriceIncreaseAnalysisView />}</CostsAccess>;
  }
}
