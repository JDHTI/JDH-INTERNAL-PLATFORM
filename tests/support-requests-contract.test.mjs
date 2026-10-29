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
const service = await import(await moduleUrl("../src/features/supports/services/requests.service.ts", { "@/shared/lib/api-client": client }));

test("Commercial list and detail send mine=true to backend", async t => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url: new URL(url), options });
    return new Response(JSON.stringify({ items: [], total: 0, page: 1, size: 25 }), { headers: { "Content-Type": "application/json" } });
  });
  await service.listRequests({ page: 2, size: 25, status: "pendiente", q: "SKU 123", mine: true });
  await service.getRequest("request-id", true);
  for (const call of calls) {
    assert.equal(call.url.searchParams.get("mine"), "true");
    assert.equal(call.options.credentials, "include");
  }
  assert.equal(calls[0].url.searchParams.get("page"), "2");
  assert.equal(calls[0].url.searchParams.get("q"), "SKU 123");
});
test("decision and cancellation bodies preserve the reviewed versions and reason", async t => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url: new URL(url), options });
    return new Response("{}", { headers: { "Content-Type": "application/json" } });
  });
  await service.createRequest("s", { version: 3, value: -.05, reason: "Acuerdo comercial" });
  await service.approveRequest("r", { version: 2, support_version: 4 });
  await service.rejectRequest("r", { version: 2, reason: "Sin presupuesto" });
  await service.cancelJdh("s", { version: 5, reason: "Fin del aporte JDH" });
  assert.deepEqual(JSON.parse(calls[0].options.body), { version: 3, value: -.05, reason: "Acuerdo comercial" });
  assert.deepEqual(JSON.parse(calls[1].options.body), { version: 2, support_version: 4 });
  assert.deepEqual(JSON.parse(calls[2].options.body), { version: 2, reason: "Sin presupuesto" });
  assert.equal(calls[3].options.method, "DELETE");
  assert.equal(calls[3].url.pathname.endsWith("/supplier-supports/s/jdh-support"), true);
  assert.deepEqual(JSON.parse(calls[3].options.body), { version: 5, reason: "Fin del aporte JDH" });
});
test("a conflict is surfaced once without automatically applying a new version", async t => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls++; return new Response(JSON.stringify({ detail: "El acuerdo cambió" }), { status: 409, headers: { "Content-Type": "application/json" } }); });
  await assert.rejects(service.approveRequest("r", { version: 1, support_version: 2 }), error => error.status === 409);
  assert.equal(calls, 1);
});
test("403 preserves the backend denial and cannot produce a successful decision", async t => {
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ detail: "Solo BI y administradores pueden gestionar solicitudes" }), { status: 403, headers: { "Content-Type": "application/json" } }));
  await assert.rejects(service.rejectRequest("r", { version: 1, reason: "Sin autorización" }), error => error.status === 403 && error.message.includes("Solo BI"));
});
