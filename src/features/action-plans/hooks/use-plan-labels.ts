"use client";

import { useMemo } from "react";

import { makeLabels } from "../lib/labels";
import { usePlanCatalog } from "./use-action-plans";

/** The labels of every closed list: the API's when its catalog is loaded, ours until then. */
export function usePlanLabels() {
  const catalog = usePlanCatalog();
  return useMemo(() => makeLabels(catalog.data), [catalog.data]);
}
