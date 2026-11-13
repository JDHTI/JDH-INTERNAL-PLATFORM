import type { DecimalText } from "./quotations.types";

/** One value a liquor carries on the lists, and which lists carry it. */
export interface TaxValue {
  amount: DecimalText | null;
  lists: string[];
}

export type LiquorFlag = "varios_valores" | "sin_valor" | "difiere_maestro";

/** An active product with a liquor tax key, across every list. */
export interface Liquor {
  sku: string;
  description: string | null;
  tax_key: string;
  tax_key_name: string | null;
  tax_group: string | null;
  /** List 1's value, else the most common among the national lists. */
  national: DecimalText | null;
  /** The most common among the Coast lists. */
  coast: DecimalText | null;
  national_values: TaxValue[];
  coast_values: TaxValue[];
  master_national: DecimalText | null;
  master_coast: DecimalText | null;
  lists_with_price: number;
  flags: LiquorFlag[];
  flag_labels: string[];
}

/** An active liquor or wine of a liquor tax group without the key. */
export interface LiquorSuspect {
  sku: string;
  description: string | null;
  tax_group: string | null;
  tax_group_name: string | null;
  lists_with_value: number;
}

export interface LiquorOverview {
  items: Liquor[];
  suspects: LiquorSuspect[];
  /** Lists that pay the Coast value; every other list pays the national one. */
  coast_lists: string[];
  /** The caller is one of the collaborators who change the liquor tax (`impuesto-licor`). */
  can_manage: boolean;
}

export type LiquorUpdateStatus = "pendiente_validacion" | "pendiente_carga" | "cargada" | "devuelta";

export interface LiquorChange {
  sku: string;
  description: string | null;
  tax_key: string;
  tax_group: string | null;
  national: DecimalText;
  coast: DecimalText;
  previous_national: DecimalText | null;
  previous_coast: DecimalText | null;
  lists: number;
}

/** A bulk change of the liquor tax over every list. */
export interface LiquorUpdate {
  id: string;
  status: LiquorUpdateStatus;
  status_label: string;
  changes: LiquorChange[];
  /** Prices it writes (list × reference), fixed when it was validated. */
  row_count: number;
  list_count: number;
  note: string | null;
  review_note: string | null;
  activation_date: string | null;
  created_by: string;
  created_at: string;
  validated_by: string | null;
  validated_at: string | null;
  uploaded_by: string | null;
  uploaded_at: string | null;
  version: number;
}

export interface LiquorChangeInput {
  sku: string;
  national: DecimalText;
  coast: DecimalText;
}
