import { apiFetch } from "@/shared/lib/api-client";

export interface PickerPage { items: Record<string, unknown>[]; total: number; page: number; size: number }
export function getPickerPage(endpoint: string, q: string, page: number) {
  // Keep inactive rows searchable: support agreements can refer to historical customers.
  return apiFetch<PickerPage>(endpoint, { query: { q, page, size: 50 } });
}
export function nextPickerPage(page: PickerPage): number | undefined {
  return page.page * page.size < page.total ? page.page + 1 : undefined;
}
