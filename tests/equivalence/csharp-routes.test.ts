import { describe, expect, it } from "vitest";
import { convert } from "@schema-transformation-toolkit/sdk";
import {
  csharpFeatureFixture,
  sharedSemanticFixtures,
  selectEquivalenceFixtures,
} from "../fixtures/semantics/index.js";
import type {
  SemanticFixture,
  SemanticFixtureFormatId,
} from "../fixtures/semantics/types.js";
import {
  expectIrEquivalent,
  normalizeJavaReferenceNullabilityForTest,
} from "../helpers/schema-equivalence.js";
import { parseSemanticFixture } from "../helpers/semantic-fixture-parser.js";

type CSharpRouteFormat =
  | "csharp"
  | "json-schema"
  | "typescript"
  | "rust"
  | "python"
  | "go"
  | "java"
  | "kotlin";

const csharpRoutes = [
  ["csharp", "csharp"],
  ["csharp", "typescript"],
  ["typescript", "csharp"],
  ["csharp", "json-schema"],
  ["json-schema", "csharp"],
  ["csharp", "rust"],
  ["rust", "csharp"],
  ["csharp", "python"],
  ["python", "csharp"],
  ["csharp", "go"],
  ["go", "csharp"],
  ["csharp", "java"],
  ["java", "csharp"],
  ["csharp", "kotlin"],
  ["kotlin", "csharp"],
] as const;

describe("equivalence: C# V1 routes", () => {
  it.each(csharpRoutes)(
    "preserves Shape IR through %s -> %s",
    (sourceFormat, targetFormat) => {
      const route =
        `${sourceFormat}->${targetFormat}` as `${SemanticFixtureFormatId}->${SemanticFixtureFormatId}`;
      const fixtures = selectEquivalenceFixtures(
        sharedSemanticFixtures,
        sourceFormat,
        targetFormat,
      );
      expect(fixtures, `No fixture supports ${route}`).not.toHaveLength(0);
      expect(
        fixtures.filter(
          (fixture) => !fixture.equivalenceRoutes?.includes(route),
        ),
        `Every eligible fixture must explicitly declare ${route}`,
      ).toEqual([]);
      for (const fixture of fixtures)
        runCSharpRoute(fixture, sourceFormat, targetFormat, route);
    },
  );

  it("reports target semantic notes for representation widening", () => {
    const source = csharpFeatureFixture.sources.csharp;
    expect(source).toBeDefined();
    if (!source) return;
    const result = convert({
      sourceFormat: "csharp",
      targetFormat: "typescript",
      input: source.input,
      name: csharpFeatureFixture.canonicalShape.name.source,
      advanced: { parser: { csharp: source.options } },
    });
    expect(result.ok, JSON.stringify(result)).toBe(true);
    if (!result.ok) return;
    const expectation =
      csharpFeatureFixture.conversionExpectations?.["csharp->typescript"];
    expect(result.semanticNotes?.map((note) => note.code)).toContain(
      expectation?.generatorExpectation?.semanticNoteCodes?.[0],
    );
    expect(result.report?.semanticCaveats?.map((note) => note.code)).toContain(
      expectation?.semanticCaveatCodes?.[0],
    );
  });
});

function runCSharpRoute(
  fixture: SemanticFixture,
  sourceFormat: CSharpRouteFormat,
  targetFormat: CSharpRouteFormat,
  route: `${SemanticFixtureFormatId}->${SemanticFixtureFormatId}`,
): void {
  const source = fixture.sources[sourceFormat];
  expect(source, `${fixture.id}: missing ${sourceFormat} source`).toBeDefined();
  if (!source) return;
  const input =
    sourceFormat === "json-schema"
      ? JSON.stringify(source.input)
      : String(source.input);
  const result = convert({
    sourceFormat,
    targetFormat,
    input,
    name: fixture.canonicalShape.name.source,
    includeArtifacts: true,
    advanced: {
      parser: { [sourceFormat]: source.options },
    },
  });

  expect(result.ok, `${fixture.id}: ${sourceFormat}->${targetFormat}`).toBe(
    true,
  );
  if (!result.ok) return;
  expect(result.plan.irSequence).toEqual(["shape"]);
  expect(result.artifacts?.shape).toBeDefined();
  const expectation = fixture.conversionExpectations?.[route];
  expect(
    expectation,
    `${fixture.id}: missing expectation for ${route}`,
  ).toBeDefined();
  const actualLosses = (result.losses ?? []).map((loss) => ({
    lostCapability: loss.lostCapability,
    sourcePath: loss.sourcePath,
  }));
  expect(actualLosses).toEqual(expectation?.semanticLosses ?? []);
  expect((result.semanticNotes ?? []).map((note) => note.code)).toEqual(
    expectation?.generatorExpectation?.semanticNoteCodes ?? [],
  );
  expect(
    (result.report?.semanticCaveats ?? []).map((caveat) => caveat.code),
  ).toEqual(expectation?.semanticCaveatCodes ?? []);
  const targetSource = {
    input:
      targetFormat === "json-schema" ? result.output : String(result.output),
    options: {
      name: fixture.canonicalShape.name.source,
      entry: fixture.canonicalShape.rootName?.source,
    },
  };
  const targetFixture: SemanticFixture = {
    ...fixture,
    sources: { ...fixture.sources, [targetFormat]: targetSource },
  };
  const target = parseSemanticFixture(targetFixture, targetFormat);
  const expectedDocument = fixture.canonicalShape;
  expectIrEquivalent(
    sourceFormat === "java" || targetFormat === "java"
      ? normalizeJavaReferenceNullabilityForTest(
          target.document,
          expectedDocument,
        )
      : target.document,
    expectedDocument,
  );
}
