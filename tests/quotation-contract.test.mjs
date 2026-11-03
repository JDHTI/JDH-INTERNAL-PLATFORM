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
const sharedFormat = await moduleUrl("../src/shared/lib/format.ts");
const client = await moduleUrl("../src/shared/lib/api-client.ts");
const { parsePriceInput, priceInputText, samePrice, parseReferenceText } = await import(
  await moduleUrl("../src/features/quotations/lib/format.ts", { "@/shared/lib/format": sharedFormat })
);
const service = await import(
  await moduleUrl("../src/features/quotations/services/quotations.service.ts", { "@/shared/lib/api-client": client })
);

test("typed prices become the decimal string the API takes", () => {
  assert.deepEqual(parsePriceInput("3.323,36"), { value: "3323.36" });
  assert.deepEqual(parsePriceInput("3323,36"), { value: "3323.36" });
  assert.deepEqual(parsePriceInput("3323.36"), { value: "3323.36" });
  assert.deepEqual(parsePriceInput("3.323"), { value: "3323" });
  assert.deepEqual(parsePriceInput("1.234.567"), { value: "1234567" });
  assert.deepEqual(parsePriceInput("1,234.5"), { value: "1234.5" });
  assert.deepEqual(parsePriceInput("$ 12.000"), { value: "12000" });
  assert.deepEqual(parsePriceInput("0,1234"), { value: "0.1234" });
  assert.deepEqual(parsePriceInput("  "), { value: null });
});

test("unreadable prices are refused before they reach the API", () => {
  assert.ok("error" in parsePriceInput("-100"));
  assert.ok("error" in parsePriceInput("12a"));
  assert.ok("error" in parsePriceInput("1,23456"));
  assert.ok("error" in parsePriceInput("1,2,3"));
});

test("what the cell prints reads back as the same price", () => {
  for (const stored of ["3323.3600", "3323.0000", "149551.0000", "0.5000", "1234567.1234"]) {
    const parsed = parsePriceInput(priceInputText(stored));
    assert.ok(samePrice(parsed.value, stored), `${stored} -> ${priceInputText(stored)} -> ${parsed.value}`);
  }
});

test("pasted references split like the API: lines, commas, semicolons, tabs, spaces", () => {
  assert.deepEqual(parseReferenceText("26278\n10833\r\n 2505 "), { skus: ["26278", "10833", "2505"], repeated: 0 });
  assert.deepEqual(parseReferenceText("26278, 10833;2505\t1861"), { skus: ["26278", "10833", "2505", "1861"], repeated: 0 });
  assert.deepEqual(parseReferenceText(" \n , "), { skus: [], repeated: 0 });
});

test("an Excel number with decimals is the plain reference, and repeats are counted", () => {
  assert.deepEqual(parseReferenceText("2537.0\n2537\n26278.00\nAB.0"), { skus: ["2537", "26278", "AB.0"], repeated: 1 });
});

function captureFetch(t, body = {}) {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, init) => {
    calls.push({ url: new URL(url), init });
    return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
  });
  return calls;
}

test("the list sends mine=false explicitly, since the API defaults to true", async (t) => {
  const calls = captureFetch(t, { items: [], total: 0, page: 1, size: 20 });
  await service.listQuotations({ mine: false, status: "", q: "", page: 1, size: 20 });
  assert.equal(calls[0].url.pathname.endsWith("/quotations"), true);
  assert.equal(calls[0].url.searchParams.get("mine"), "false");
  assert.equal(calls[0].url.searchParams.get("status"), null);
});

test("line updates go as one batch with the version", async (t) => {
  const calls = captureFetch(t);
  await service.updateLines("q-1", 7, [{ sku: "123", new_price: "100.5" }, { sku: "456", new_price: null }]);
  assert.equal(calls[0].init.method, "PUT");
  assert.ok(calls[0].url.pathname.endsWith("/quotations/q-1/lines"));
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    version: 7,
    lines: [{ sku: "123", new_price: "100.5" }, { sku: "456", new_price: null }],
  });
});

test("added references go in one POST, and removal carries the version in the query", async (t) => {
  const calls = captureFetch(t);
  await service.addLines("q-1", 4, { text: "2537.0\n26278", skus: ["10833"] });
  await service.removeLine("q-1", "26278", 5);
  await service.addLines("q-1", 6, { text: "  ", skus: ["10833"] });
  assert.equal(calls[0].init.method, "POST");
  assert.ok(calls[0].url.pathname.endsWith("/quotations/q-1/lines"));
  // The text goes as pasted: the API is the one that splits and normalizes it.
  assert.deepEqual(JSON.parse(calls[0].init.body), { version: 4, text: "2537.0\n26278", skus: ["10833"] });
  assert.deepEqual(JSON.parse(calls[2].init.body), { version: 6, skus: ["10833"] });
  assert.equal(calls[1].init.method, "DELETE");
  assert.ok(calls[1].url.pathname.endsWith("/quotations/q-1/lines/26278"));
  assert.equal(calls[1].url.searchParams.get("version"), "5");
});

test("create and generate send the contract's fields", async (t) => {
  const calls = captureFetch(t);
  await service.createQuotation("80140929", 12);
  await service.generateQuotation("q-1", 3, { activation_date: "2026-11-04", price_list_id: "1M" });
  assert.deepEqual(JSON.parse(calls[0].init.body), { customer_nit: "80140929", window_months: 12 });
  assert.deepEqual(JSON.parse(calls[1].init.body), { version: 3, activation_date: "2026-11-04", price_list_id: "1M" });
});
