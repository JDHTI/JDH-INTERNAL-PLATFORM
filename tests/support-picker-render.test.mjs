import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = await readFile(new URL("../src/shared/components/pickers/base-picker.tsx", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
test("Salamanca's three branches render one selectable NIT without local text filtering", () => {
  let receivedOptions;
  const branches = ["001", "002", "003"].map(branch_id => ({ nit: "80140929", branch_id, legal_name: "SALAMANCA MEDINA MIGUEL ANGEL", is_active: branch_id === "001" }));
  const mocks = {
    react: { ...React, useState: () => ["80140929", () => {}] },
    "@tanstack/react-query": { useInfiniteQuery: () => ({ data: { pages: [{ items: branches }] }, isSuccess: true }) },
    "@/shared/hooks/use-debounced-value": { useDebouncedValue: value => value },
    "@/shared/components/ui/autocomplete": { Autocomplete: props => { receivedOptions = props.options; return React.createElement("span", {}, props.options.map(option => `${option.label} ${option.hint}`).join("; ")); } },
    "@/shared/components/ui/button": { Button: "button" },
    "@/shared/lib/api-client": { errorMessage: String },
    "./base-picker.service": {},
  };
  const loaded = { exports: {} };
  new Function("require", "module", "exports", code)(id => mocks[id] ?? require(id), loaded, loaded.exports);
  const html = renderToStaticMarkup(React.createElement(loaded.exports.default, { config: loaded.exports.CUSTOMER_PICKER, selected: null, onSelect: () => {}, onClear: () => {} }));
  assert.deepEqual(receivedOptions, [{ value: "80140929", label: "SALAMANCA MEDINA MIGUEL ANGEL", hint: "NIT 80140929" }]);
  assert.match(html, /SALAMANCA MEDINA MIGUEL ANGEL/);
  assert.match(html, /NIT 80140929/);
});
