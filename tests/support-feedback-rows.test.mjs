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
const labels = await load("../src/features/supports/lib/request-label.ts", {});
const valueMock = { formatRequestValue: (value, net) => value === null || value === undefined ? "sin JDH" : `${net ? "$" : "%"}${value}` };
const jdhValues = await load("../src/features/supports/components/request-jdh-values.tsx", { "../lib/request-values": valueMock });
const Dialog = ({ children, title, description }) => React.createElement("section", {}, React.createElement("h2", {}, title), description && React.createElement("p", {}, description), children);
const rows = await load("../src/features/supports/components/request-rows.tsx", {
  "@/shared/components/ui/button": { Button },
  "@/shared/components/ui/badge": { Badge: ({ children }) => React.createElement("span", {}, children) },
  "../lib/request-values": { formatRequestValue: value => String(value) },
  "./jdh-support": { dateTime: value => value },
  "../lib/request-label": labels,
});
const item = { id: "request-1", support_id: "support-1", supplier_name: "Proveedor real", supplier_code: "P1", mode: "porcentaje", value: ".05", reason: "Justificación completa sin truncar", status: "rechazada", requested_by: "comercial@example.com", created_at: "2026-10-29T12:00:00Z", snapshot: { supplier_name: "Proveedor snapshot", customer_name: "Cliente", customer_nit: "80140929", product_sku: "SKU-1", value_unit: "caja", program: "PROGRAMA OCULTO", calc_method: "pct_costo", jdh_pct: ".01" }, decided_by: "bi@example.com", decided_at: "2026-10-29T13:00:00Z", decision_reason: "Motivo completo de rechazo", version: 2, support_version: 3, support: { calc_method: "pct_costo", jdh_pct: ".02", version: 4 }, events: [] };

test("Commercial and BI render full request rows with no link back to the master", async () => {
  const browser = await load("../src/features/supports/components/requests-browser.tsx", {
    "@/shared/components/ui/alert": { Alert },
    "@/shared/components/pager": { __esModule: true, default: () => null },
    "@/shared/components/ui/button": { Button },
    "@/shared/components/ui/dialog": { Dialog },
    "@/shared/components/ui/dropdown": { Dropdown: () => null },
    "@/shared/components/ui/input": { Input: () => null },
    "@/shared/components/ui/textarea": {},
    "@/shared/hooks/use-debounced-value": { useDebouncedValue: value => value },
    "@/shared/lib/api-client": {},
    "../hooks/use-requests": { useRequests: () => ({ data: { items: [item], total: 1, page: 1, size: 25 } }), useRequest: () => ({ data: item }), useRequestAction: () => ({}) },
    "../hooks/use-supports": { useSupportPermissions: () => ({ data: { can_request: true, can_review: true } }) },
    "../lib/request-values": {},
    "./jdh-support": { dateTime: value => value, JdhEvents: () => React.createElement("p", {}, "Eventos de auditoría") },
    "./discard-dialog": { __esModule: true, default: () => null },
    "./request-rows": rows,
    "./request-jdh-values": jdhValues,
    "../lib/request-label": labels,
  });
  for (const review of [false, true]) {
    const html = renderToStaticMarkup(React.createElement(browser.default, { review }));
    assert.match(html, /<table/);
    assert.match(html, /<tbody[^>]*><tr/);
    assert.match(html, /Apoyo JDH · Proveedor real/);
    assert.match(html, /Ver solicitud/);
    assert.doesNotMatch(html, /Ver justificacion/);
    assert.match(html, /Acciones<\/th>/);
    assert.doesNotMatch(html, /Justificación completa sin truncar|Motivo completo de rechazo|PROGRAMA OCULTO|Proveedor snapshot/);
    assert.match(html, /80140929/);
    assert.doesNotMatch(html, /line-clamp|Volver al maestro|href=/);
    const detail = renderToStaticMarkup(React.createElement(browser.RequestDialog, { id: item.id, review, onClose: () => {} }));
    assert.match(detail, /JDH al solicitar/);
    assert.match(detail, /JDH vigente/);
    assert.match(detail, /JDH propuesto/);
    assert.match(detail, /sin truncar/);
    assert.match(detail, /Motivo completo de rechazo/);
    assert.doesNotMatch(detail, /<details|Eventos de auditor|Costo de referencia|Unidades por caja|Vigencia/);
  }
});

test("justification appears in request details and provider label supports fallback", () => {
  assert.equal(labels.requestSupplier({ ...item, supplier_name: null }), "P1");
  assert.equal(labels.requestSupplier({ ...item, supplier_name: null, supplier_code: null }), "Proveedor snapshot");
});

test("compact JDH comparison preserves net cost, unit and precision independently of supplier value", () => {
  const net = { ...item, mode: "costo_neto", value: "78.123456", snapshot: { calc_method: "costo_neto", jdh_net_cost: "70.123456", supplier_value: "999", value_unit: "kg" }, support: { calc_method: "costo_neto", jdh_net_cost: "75.654321", supplier_value: "999", value_unit: "kg" } };
  const html = renderToStaticMarkup(React.createElement(jdhValues.default, { request: net }));
  for (const amount of ["70.123456", "75.654321", "78.123456"]) assert.match(html, new RegExp(amount.replace(".", "\\.")));
  assert.match(html, /kg/);
  assert.doesNotMatch(html, /999|Proveedor|Vigencia/);
});