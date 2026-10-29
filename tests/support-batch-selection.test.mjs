import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../src/features/supports/lib/request-selection.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { requestSelectionError, sameRequestScope } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const row = (id, changes = {}) => ({ id, version: 1, commercial_supplier_id: "supplier-1", supplier_code: "P1", customer_nit: "80140929", customer_name: "SALAMANCA MEDINA MIGUEL ANGEL", customer_group: null, customer_branch_id: "1", state: "vigente", needs_review: false, ...changes });

test("batch allows mixed modalities and units for one supplier and NIT across branches", () => {
  assert.equal(requestSelectionError([row("1", { calc_method: "costo_neto", value_unit: "kg" }), row("2", { customer_branch_id: "2", calc_method: "pct_costo", value_unit: "caja" })]), null);
});
test("batch rejects different customers and suppliers even with the same display name/code", () => {
  assert.equal(sameRequestScope(row("1"), row("2", { customer_nit: "other" })), false);
  assert.equal(sameRequestScope(row("1"), row("2", { commercial_supplier_id: "supplier-2" })), false);
});
test("without NIT customer name, group and branch must all match", () => {
  const first = row("1", { customer_nit: null, customer_group: "G1" });
  assert.equal(sameRequestScope(first, { ...first, id: "2" }), true);
  for (const changes of [{ customer_group: "G2" }, { customer_name: "Another customer" }, { customer_branch_id: "2" }, { customer_nit: "80140929" }]) assert.equal(sameRequestScope(first, { ...first, id: "2", ...changes }), false);
});
test("batch enforces eligibility, unique records and maximum 100", () => {
  assert.ok(requestSelectionError([]));
  assert.ok(requestSelectionError([row("1"), row("1")]));
  assert.ok(requestSelectionError([row("1", { state: "inactivo" })]));
  assert.ok(requestSelectionError([row("1", { needs_review: true })]));
  assert.equal(requestSelectionError(Array.from({ length: 100 }, (_, index) => row(String(index)))), null);
  assert.ok(requestSelectionError(Array.from({ length: 101 }, (_, index) => row(String(index)))));
});
test("missing supplier identity never joins different records", () => {
  assert.equal(sameRequestScope(row("1", { commercial_supplier_id: null, supplier_code: null }), row("2", { commercial_supplier_id: null, supplier_code: null })), false);
  assert.ok(requestSelectionError([row("1", { commercial_supplier_id: null })]));
});
