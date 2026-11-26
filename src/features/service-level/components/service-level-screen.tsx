"use client";

import PendingOrdersView from "./pending-orders-view";
import ServiceLevelAccess from "./service-level-access";
import ServiceLevelDashboard from "./service-level-dashboard";

/** The client side of each Nivel de servicio page: the permission check of its key, then its view. */
export default function ServiceLevelScreen({ view }: { view: "pending" | "dashboard" }) {
  return view === "pending" ? (
    <ServiceLevelAccess module="pendientes-pedidos">{(permissions) => <PendingOrdersView permissions={permissions} />}</ServiceLevelAccess>
  ) : (
    <ServiceLevelAccess module="nivel-servicio">{(permissions) => <ServiceLevelDashboard permissions={permissions} />}</ServiceLevelAccess>
  );
}
