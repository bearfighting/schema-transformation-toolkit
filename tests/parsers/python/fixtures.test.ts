import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { tryParsePython } from "@schema-transformation-toolkit/parser-python";

const fixtureRoot = `${process.cwd()}/tests/fixtures/python/`;

describe("Python fixture matrix", () => {
  const validFixtures = [
    ["primitive", undefined],
    ["nullable", undefined],
    ["list", undefined],
    ["nested-nullable", undefined],
    ["references", { entry: "User" }],
    ["recursive", undefined],
    ["mutually-recursive", { entry: "Parent" }],
    ["multiple-definitions", { entry: "User" }],
  ] as const;

  it.each(validFixtures)(
    "matches the independent expected Shape IR fixture: %s",
    (name, options) => {
      const source = readFileSync(`${fixtureRoot}valid/${name}.py`, "utf8");
      const expected = JSON.parse(
        readFileSync(`${fixtureRoot}valid/${name}.expected.json`, "utf8"),
      );
      const result = tryParsePython(source, options);
      expect(result).toEqual({ ok: true, document: expected });
    },
  );

  const unsupportedFixtures = [
    ["union", "unsupported-python-union"],
    ["default", "unsupported-python-default"],
    ["default-factory", "unsupported-python-default"],
    ["inheritance", "unsupported-python-inheritance"],
    ["decorator", "unsupported-python-decorator"],
    ["tuple", "unsupported-python-type"],
    ["set", "unsupported-python-type"],
    ["literal", "unsupported-python-type"],
    ["any", "unsupported-python-type"],
    ["annotated", "unsupported-python-type"],
    ["unknown-reference", "unknown-python-reference"],
  ] as const;

  it.each(unsupportedFixtures)(
    "returns the stable failure for unsupported fixture: %s",
    (name, code) => {
      const source = readFileSync(
        `${fixtureRoot}unsupported/${name}.py`,
        "utf8",
      );
      const expected = JSON.parse(
        readFileSync(`${fixtureRoot}unsupported/${name}.expected.json`, "utf8"),
      );
      const result = tryParsePython(source);
      expect(result).toMatchObject({ ok: false, code: expected.code });
      if (result.ok) throw new Error("Expected fixture parsing to fail.");
      expect(result.code).toBe(code);
    },
  );

  it("matches the invalid fixture error and source line", () => {
    const source = readFileSync(`${fixtureRoot}invalid/malformed.py`, "utf8");
    const expected = JSON.parse(
      readFileSync(`${fixtureRoot}invalid/malformed.expected.json`, "utf8"),
    );
    const result = tryParsePython(source);
    expect(result).toMatchObject({
      ok: false,
      code: expected.code,
      diagnostics: [{ evidence: { position: { line: expected.line } } }],
    });
  });
});
