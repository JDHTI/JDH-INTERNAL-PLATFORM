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
const { parsePriceInput, parseMarginInput, priceInputText, samePrice, parseReferenceText } = await import(
  await moduleUrl("../src/features/quotations/lib/format.ts", { "@/shared/lib/format": sharedFormat })
);
const service = await import(
  await moduleUrl("../src/features/quotations/services/quotations.service.ts", { "@/shared/lib/api-client": client })
);

test("typed prices become the whole-peso string the API takes", () => {
  assert.deepEqual(parsePriceInput("3.323"), { value: "3323" });
  assert.deepEqual(parsePriceInput("3,323"), { value: "3323" });
  assert.deepEqual(parsePriceInput("1.234.567"), { value: "1234567" });
  assert.deepEqual(parsePriceInput("$ 12.000"), { value: "12000" });
  assert.deepEqual(parsePriceInput("3323"), { value: "3323" });
  // What Excel pastes for a whole number.
  assert.deepEqual(parsePriceInput("3323,00"), { value: "3323" });
  assert.deepEqual(parsePriceInput("3.323,0"), { value: "3323" });
  assert.deepEqual(parsePriceInput("007"), { value: "7" });
  assert.deepEqual(parsePriceInput("1.000"), { value: "1000" });
  assert.deepEqual(parsePriceInput("  "), { value: null });
});

test("decimals and unreadable prices are refused before they reach the API", () => {
  for (const text of ["3.323,36", "3323,5", "3323.36", "-100", "12a", "1,2,3", "12.34"]) {
    assert.ok("error" in parsePriceInput(text), text);
  }
  assert.match(parsePriceInput("3323,5").error, /pesos enteros/);
});

test("a typed margin becomes the fraction the API takes", () => {
  assert.deepEqual(parseMarginInput("30"), { value: "0.3" });
  assert.deepEqual(parseMarginInput("30 %"), { value: "0.3" });
  assert.deepEqual(parseMarginInput("27,5"), { value: "0.275" });
  assert.deepEqual(parseMarginInput("12.25"), { value: "0.1225" });
  for (const text of ["", "0", "100", "abc", "-5", "30,123"]) assert.ok("error" in parseMarginInput(text), text);
});

test("what the cell prints reads back as the same price", () => {
  for (const stored of ["3323.0000", "149551.0000", "1234567.0000", "7.0000"]) {
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

test("line updates go as one batch with the version, prices and margins alike", async (t) => {
  const calls = captureFetch(t);
  await service.updateLines("q-1", 7, [{ sku: "123", new_price: "3323" }, { sku: "456", new_price: null }]);
  await service.updateLines("q-1", 8, [{ sku: "123", margin_pct: "0.3" }, { sku: "789", margin_pct: "0.3" }]);
  assert.equal(calls[0].init.method, "PUT");
  assert.ok(calls[0].url.pathname.endsWith("/quotations/q-1/lines"));
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    version: 7,
    lines: [{ sku: "123", new_price: "3323" }, { sku: "456", new_price: null }],
  });
  assert.deepEqual(JSON.parse(calls[1].init.body), {
    version: 8,
    lines: [{ sku: "123", margin_pct: "0.3" }, { sku: "789", margin_pct: "0.3" }],
  });
});

test("the review flow posts the contract's bodies to its own routes", async (t) => {
  const calls = captureFetch(t);
  await service.confirmQuotation("q-1", 3, { list_action: "creacion", price_list_id: "C97", new_list_name: "COTIZADOR X", activation_date: "2026-11-04" });
  await service.returnQuotation("q-1", 4, "Revisar el margen de 1081");
  await service.validateQuotation("q-1", 5);
  assert.deepEqual(
    calls.map((call) => [call.init.method, call.url.pathname.split("/").slice(-1)[0]]),
    [["POST", "confirm"], ["POST", "return"], ["POST", "validate"]]
  );
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    version: 3,
    list_action: "creacion",
    price_list_id: "C97",
    new_list_name: "COTIZADOR X",
    activation_date: "2026-11-04",
  });
  assert.deepEqual(JSON.parse(calls[1].init.body), { version: 4, note: "Revisar el margen de 1081" });
  assert.deepEqual(JSON.parse(calls[2].init.body), { version: 5 });
});

test("the template goes up as multipart with the file and the version", async (t) => {
  const calls = captureFetch(t);
  const file = new File(["x"], "cotizacion.xlsx");
  await service.uploadQuotationTemplate("q-1", 9, file);
  assert.equal(calls[0].init.method, "POST");
  assert.ok(calls[0].url.pathname.endsWith("/quotations/q-1/template"));
  assert.ok(calls[0].init.body instanceof FormData);
  assert.equal(calls[0].init.body.get("version"), "9");
  assert.equal(calls[0].init.body.get("file").name, "cotizacion.xlsx");
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

test("create sends the contract's fields", async (t) => {
  const calls = captureFetch(t);
  await service.createQuotation("80140929", 12);
  assert.deepEqual(JSON.parse(calls[0].init.body), { customer_nit: "80140929", window_months: 12 });
});
