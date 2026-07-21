import { describe, expect, it } from "vitest";
import { tryGenerateTypeScript } from "@aio/generator-typescript";
import { sharedSemanticFixtures } from "../../fixtures/semantics/index.js";
import {
  expectDiagnosticCodes,
  expectSemanticNoteCodes,
} from "../../helpers/diagnostic-assertions.js";
import { getFixtureDocument } from "../../helpers/generator-contract.js";
import { expectValidTypeScriptSyntax } from "../../helpers/typescript-syntax.js";

describe("generator-typescript contract", () => {
  for (const fixture of sharedSemanticFixtures) {
    it(`renders valid TypeScript for ${fixture.id}`, () => {
      const result = tryGenerateTypeScript(getFixtureDocument(fixture));

      expect(result.ok).toBe(true);

      if (!result.ok) {
        throw new Error(
          `Expected TypeScript generation for fixture "${fixture.id}" to succeed.`,
        );
      }

      expectValidTypeScriptSyntax(result.output, `${fixture.id}.ts`);
    });
  }

  const truthfulnessFixtures = sharedSemanticFixtures.filter(
    (fixture) => fixture.generatorExpectations?.["generator:typescript"],
  );

  for (const fixture of truthfulnessFixtures) {
    it(`keeps generator truthfulness explicit for ${fixture.id}`, () => {
      const result = tryGenerateTypeScript(getFixtureDocument(fixture));
      const expectation =
        fixture.generatorExpectations?.["generator:typescript"];

      expect(result.ok).toBe(true);

      if (!result.ok || !expectation) {
        throw new Error(
          `Expected TypeScript generator truthfulness fixture "${fixture.id}" to succeed.`,
        );
      }

      expectDiagnosticCodes(
        result.diagnostics,
        expectation.diagnosticCodes ?? [],
      );
      expectSemanticNoteCodes(
        result.semanticNotes,
        expectation.semanticNoteCodes ?? [],
      );
      expectValidTypeScriptSyntax(result.output, `${fixture.id}.ts`);
    });
  }

  it("keeps recursive-reference fixtures renderable without syntax regressions", () => {
    const fixture = sharedSemanticFixtures.find(
      (candidate) => candidate.id === "reference.recursive-reference",
    );

    expect(fixture).toBeDefined();

    if (!fixture) {
      throw new Error("Expected recursive-reference fixture to exist.");
    }

    const result = tryGenerateTypeScript(getFixtureDocument(fixture));

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error(
        "Expected recursive-reference TypeScript generation to succeed.",
      );
    }

    expect(result.output).toContain("children: Tree[];");
    expectValidTypeScriptSyntax(
      result.output,
      "reference.recursive-reference.ts",
    );
  });
});
