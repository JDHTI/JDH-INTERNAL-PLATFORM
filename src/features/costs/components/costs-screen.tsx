"use client";

import PriceIncreaseAnalysisView from "@/features/commercial-masters/components/price-increase-analysis-view";
import PriceIncreasesView from "@/features/commercial-masters/components/price-increases-view";
import SiesaLoadsView from "@/features/commercial-masters/components/siesa-loads-view";

import CostsAccess from "./costs-access";
import EntriesView from "./entries-view";
import IncreaseRequestDetailView from "./increase-request-detail";
import IncreaseRequestsView from "./increase-requests-view";
import NoveltiesView from "./novelties-view";

export type CostsView =
  | { kind: "entries" }
  | { kind: "novelties" }
  | { kind: "requests"; basePath: string }
  | { kind: "request"; basePath: string; requestId: string }
  | { kind: "ledger" }
  | { kind: "ledger-analysis" }
  | { kind: "ledger-loads" };

/**
 * The client side of each Costos page: the permission check of its key, then
 * its view. The increase ledger reuses the masters' history and analysis; its
 * endpoints answer `can_manage` for either key.
 */
export default function CostsScreen({ view }: { view: CostsView }) {
  switch (view.kind) {
    case "entries":
      return <CostsAccess module="analisis-entradas">{(permissions) => <EntriesView permissions={permissions} />}</CostsAccess>;
    case "novelties":
      return <CostsAccess module="novedades-compras">{(permissions) => <NoveltiesView permissions={permissions} />}</CostsAccess>;
    case "requests":
      return (
        <CostsAccess module="alzas-proveedor">
          {(permissions) => <IncreaseRequestsView permissions={permissions} basePath={view.basePath} />}
        </CostsAccess>
      );
    case "request":
      return (
        <CostsAccess module="alzas-proveedor">
          {(permissions) => <IncreaseRequestDetailView requestId={view.requestId} permissions={permissions} basePath={view.basePath} />}
        </CostsAccess>
      );
    case "ledger":
      return <CostsAccess module="acumulado-alzas">{() => <PriceIncreasesView />}</CostsAccess>;
    case "ledger-analysis":
      return <CostsAccess module="acumulado-alzas">{() => <PriceIncreaseAnalysisView />}</CostsAccess>;
    case "ledger-loads":
      return <CostsAccess module="acumulado-alzas">{() => <SiesaLoadsView />}</CostsAccess>;
  }
}
