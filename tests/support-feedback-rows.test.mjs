import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
async function load(path, mocks) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const loaded = { exports: {} };
  new Function("require", "module", "exports", code)(id => mocks[id] ?? require(id), loaded, loaded.exports);
  return loaded.exports;
}
const { Alert } = await load("../src/shared/components/ui/alert.tsx", { "@/shared/lib/utils": { cn: (...classes) => classes.filter(Boolean).join(" ") } });
test("success feedback uses green status semantics while failures remain danger alerts", () => {
  const success = renderToStaticMarkup(React.createElement(Alert, { severity: "success" }, "Solicitudes enviadas"));
  assert.match(success, /role="status"/);
  assert.match(success, /bg-success-surface text-success/);
  assert.doesNotMatch(success, /text-danger/);
  const failure = renderToStaticMarkup(React.createElement(Alert, { severity: "danger" }, "Sin permiso"));
  assert.match(failure, /role="alert"/);
  assert.match(failure, /bg-danger-surface text-danger/);
});

const Button = ({ children, ...props }) => React.createElement("button", props, children);
const rows = await load("../src/features/supports/components/request-rows.tsx", {
  "@/shared/components/ui/button": { Button },
  "@/shared/components/ui/badge": { Badge: ({ children }) => React.createElement("span", {}, children) },
  "../lib/request-values": { formatRequestValue: value => String(value) },
  "./jdh-support": { dateTime: value => value },
});
const item = { id: "request-1", support_id: "support-1", mode: "porcentaje", value: ".05", reason: "Justificación completa sin truncar", status: "rechazada", requested_by: "comercial@example.com", created_at: "2026-10-29T12:00:00Z", snapshot: { supplier_name: "Proveedor", customer_name: "Cliente", customer_nit: "80140929", product_sku: "SKU-1", value_unit: "caja" }, decided_by: "bi@example.com", decided_at: "2026-10-29T13:00:00Z", decision_reason: "Motivo completo de rechazo" };

test("Commercial and BI render full request rows with no link back to the master", async () => {
  const browser = await load("../src/features/supports/components/requests-browser.tsx", {
    "@/shared/components/ui/alert": { Alert },
    "@/shared/components/pager": { __esModule: true, default: () => null },
    "@/shared/components/ui/button": { Button },
    "@/shared/components/ui/dialog": {},
    "@/shared/components/ui/dropdown": { Dropdown: () => null },
    "@/shared/components/ui/input": { Input: () => null },
    "@/shared/components/ui/textarea": {},
    "@/shared/hooks/use-debounced-value": { useDebouncedValue: value => value },
    "@/shared/lib/api-client": {},
    "../hooks/use-requests": { useRequests: () => ({ data: { items: [item], total: 1, page: 1, size: 25 } }) },
    "../hooks/use-supports": { useSupportPermissions: () => ({ data: { can_request: true, can_review: true } }) },
    "../lib/request-values": {},
    "./jdh-support": {},
    "./discard-dialog": {},
    "./request-rows": rows,
  });
  for (const review of [false, true]) {
    const html = renderToStaticMarkup(React.createElement(browser.default, { review }));
    assert.match(html, /<table/);
    assert.match(html, /<tbody[^>]*><tr/);
    assert.match(html, /Justificación completa sin truncar/);
    assert.match(html, /Motivo completo de rechazo/);
    assert.match(html, /80140929/);
    assert.doesNotMatch(html, /line-clamp|Volver al maestro|href=/);
  }
});
