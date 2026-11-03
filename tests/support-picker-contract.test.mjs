import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function moduleUrl(path, replacements = {}) {
  let source = await readFile(new URL(path, import.meta.url), "utf8");
  for (const [from, to] of Object.entries(replacements)) source = source.replaceAll(from, to);
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
  return `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
}
const client = await moduleUrl("../src/shared/lib/api-client.ts");
const { getPickerPage, nextPickerPage } = await import(await moduleUrl("../src/shared/components/pickers/base-picker.service.ts", { "@/shared/lib/api-client": client }));
test("customer NIT is sent unchanged, with pagination and no active filter", async t => {
  let url;
  t.mock.method(globalThis, "fetch", async requested => { url = new URL(requested); return new Response(JSON.stringify({ items: [{ nit: "80140929", legal_name: "SALAMANCA MEDINA MIGUEL ANGEL" }], total: 1, page: 1, size: 50 }), { headers: { "Content-Type": "application/json" } }); });
  const result = await getPickerPage("/commercial/customers", "80140929", 1);
  assert.equal(url.searchParams.get("q"), "80140929");
  assert.equal(url.searchParams.get("size"), "50");
  assert.equal(url.searchParams.get("is_active"), null);
  assert.equal(result.items[0].nit, "80140929");
});
test("subsequent pages remain accessible until the backend total is exhausted", () => {
  assert.equal(nextPickerPage({ page: 1, size: 50, total: 51 }), 2);
  assert.equal(nextPickerPage({ page: 2, size: 50, total: 51 }), undefined);
  assert.equal(nextPickerPage({ page: 1, size: 50, total: 0 }), undefined);
});
