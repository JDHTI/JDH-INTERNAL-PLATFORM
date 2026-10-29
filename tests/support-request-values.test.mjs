import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../src/features/supports/lib/request-values.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { requestValue } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("percent points map to API fractions without changing signed values", () => {
  for (const [input, expected] of [["5", .05], ["-100", -1], ["100", 1], ["0", 0], ["0.0001", .000001], ["-12,3456", -.123456]]) {
    assert.equal(requestValue(input, false), expected);
  }
});
test("percentage range and API six decimal precision are enforced", () => {
  for (const input of ["100.01", "-100.01", "0.00001", "NaN", "", "Infinity", "1e2"]) assert.equal(requestValue(input, false), null);
});
test("net cost preserves supplier unit values and enforces amount limits", () => {
  for (const [input, expected] of [["0", 0], ["123.456789", 123.456789], ["999999999999", 999999999999]]) assert.equal(requestValue(input, true), expected);
  for (const input of ["-1", "1000000000000", "0.0000001", "", "1e12"]) assert.equal(requestValue(input, true), null);
});
