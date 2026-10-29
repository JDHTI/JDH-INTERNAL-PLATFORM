import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = await readFile(new URL("../src/features/supports/components/jdh-support.tsx", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;

function renderContext(context, permissions) {
  let historyEnabled;
  const stubButton = props => React.createElement("button", props, props.children);
  const mocks = {
    "@/shared/components/ui/button": { Button: stubButton },
    "@/shared/components/ui/input": { Input: "input" },
    "@/shared/components/ui/textarea": { Textarea: "textarea" },
    "@/shared/lib/api-client": { errorMessage: String },
    "../hooks/use-supports": { useSupportPermissions: () => ({ data: permissions }) },
    "../hooks/use-requests": { useJdhHistory: (_id, enabled) => { historyEnabled = enabled; return {}; } },
    "../lib/format": Object.fromEntries(["calcMethodLabel", "formatCop", "formatPct", "formatSupplierValue"].map(key => [key, value => value ?? "—"])),
    "../lib/request-values": { formatRequestValue: value => value ?? "—" },
  };
  const loaded = { exports: {} };
  new Function("require", "module", "exports", code)(id => mocks[id] ?? require(id), loaded, loaded.exports);
  const html = renderToStaticMarkup(React.createElement(loaded.exports.default, {
    context, support: { id: "support", state: "vigente", needs_review: false, version: 3, calc_method: "costo_neto", supplier_value: 100, jdh_net_cost: 80, value_unit: "kg" },
  }));
  return { html, historyEnabled };
}
test("Commercial remains read-only for BI administrators and never fetches complete history", () => {
  const { html, historyEnabled } = renderContext("commercial", { can_request: true, can_review: true, can_manage: true });
  assert.match(html, /Solicitar apoyo JDH/);
  assert.doesNotMatch(html, /Cancelar solo aporte JDH|Historial JDH/);
  assert.equal(historyEnabled, false);
});
test("BI exposes cancellation and history while denied users cannot request", () => {
  const { html } = renderContext("manage", { can_request: true, can_review: true, can_manage: true });
  assert.match(html, /Cancelar solo aporte JDH/);
  assert.match(html, /Historial JDH/);
  assert.doesNotMatch(html, /Solicitar apoyo JDH/);
  const denied = renderContext("commercial", { can_request: false, can_review: false, can_manage: false });
  assert.doesNotMatch(denied.html, /Solicitar apoyo JDH|Cancelar solo aporte JDH|Historial JDH/);
});
