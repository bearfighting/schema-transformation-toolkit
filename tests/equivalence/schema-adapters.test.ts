import { describe, expect, it } from "vitest";
import {
  schemaArrayNode,
  schemaDocument,
  schemaFieldNode,
  schemaNullNode,
  schemaObjectNode,
  schemaRecordNode,
  schemaScalarNode,
  schemaUnionNode,
} from "@schema-transformation-toolkit/core";
import { tryGenerateOpenApi } from "@schema-transformation-toolkit/generator-openapi";
import { tryGenerateZod } from "@schema-transformation-toolkit/generator-zod";
import { tryGenerateJsonSchema } from "@schema-transformation-toolkit/generator-json-schema";
import { tryGenerateTypeScript } from "@schema-transformation-toolkit/generator-typescript";
import type {
  ConversionCapability,
  ConstraintDocument,
  SchemaDocument,
} from "@schema-transformation-toolkit/core";
import { tryGenerateRust } from "@schema-transformation-toolkit/generator-rust";
import { tryGeneratePython } from "@schema-transformation-toolkit/generator-python";
import { tryGenerateKotlin } from "@schema-transformation-toolkit/generator-kotlin";
import { tryGenerateGo } from "../../packages/generators/go/src/api.js";
import { tryGenerateJava } from "../../packages/generators/java/src/api.js";
import {
  crossLanguageRecordFixture,
  sharedSemanticFixtures,
} from "../fixtures/semantics/index.js";
import {
  expectConstraintEquivalent,
  expectFixtureConstraintsEquivalent,
  expectIrEquivalent,
  normalizeSchemaDocumentForTest,
} from "../helpers/schema-equivalence.js";
import { parseSemanticFixture } from "../helpers/semantic-fixture-parser.js";

const javaNormalizedRecordShape = schemaDocument(
  "User",
  schemaObjectNode([
    schemaFieldNode(
      "metadata",
      schemaRecordNode(
        schemaScalarNode("string"),
        schemaUnionNode([schemaScalarNode("string"), schemaNullNode()]),
      ),
      { nullable: true },
    ),
    schemaFieldNode(
      "tags",
      schemaArrayNode(
        schemaUnionNode([schemaScalarNode("string"), schemaNullNode()]),
      ),
      { nullable: true },
    ),
  ]),
);

describe("equivalence: schema adapter fixture infrastructure", () => {
  const schemaRoutes = [
    ["typescript", "json-schema"],
    ["typescript", "zod"],
    ["typescript", "openapi"],
    ["json-schema", "zod"],
    ["json-schema", "openapi"],
    ["zod", "openapi"],
  ] as const;
  const bidirectionalSchemaRoutes = schemaRoutes.flatMap(
    ([left, right]) =>
      [
        [left, right],
        [right, left],
      ] as const,
  );

  it.each(bidirectionalSchemaRoutes)(
    "runs the unified %s <-> %s route",
    (sourceFormat, targetFormat) => {
      const fixtures = sharedSemanticFixtures.filter(
        (item) =>
          item.equivalenceRoutes?.includes(
            `${sourceFormat}->${targetFormat}`,
          ) &&
          item.sources[sourceFormat] !== undefined &&
          item.sources[targetFormat] !== undefined,
      );
      if (fixtures.length === 0)
        throw new Error(`No fixture covers ${sourceFormat} -> ${targetFormat}`);

      for (const fixture of fixtures) {
        const source = parseSemanticFixture(fixture, sourceFormat);
        expectIrEquivalent(source.document, fixture.canonicalShape);
        const routeExpectation =
          fixture.conversionExpectations?.[`${sourceFormat}->${targetFormat}`];
        const constraintPolicy =
          routeExpectation?.constraintPolicy ??
          (fixture.canonicalConstraints ? "exact" : "not-applicable");
        if (fixture.canonicalConstraints && constraintPolicy === "exact") {
          expect(
            source.constraints,
            `${fixture.id}:${sourceFormat}`,
          ).toBeDefined();
        }
        if (fixture.canonicalConstraints && source.constraints) {
          expectFixtureConstraintsEquivalent(
            source.constraints,
            fixture,
            sourceFormat,
          );
        }
        if (constraintPolicy === "lossy") {
          expect(
            fixture.canonicalConstraints,
            `${fixture.id}:${sourceFormat}->${targetFormat} marks a constraint route lossy without canonical constraints`,
          ).toBeDefined();
          expect(
            (routeExpectation?.semanticLosses?.length ?? 0) > 0 ||
              (routeExpectation?.semanticCaveatCodes?.length ?? 0) > 0,
            `${fixture.id}:${sourceFormat}->${targetFormat} requires an explicit loss or caveat expectation`,
          ).toBe(true);
          expect(
            source.constraints,
            `${fixture.id}:${sourceFormat}->${targetFormat} marks a constraint route lossy but source constraints are missing`,
          ).toBeDefined();
        }
        const generated = generateForSchemaFormat(
          normalizeSchemaDocumentForTest(source.document),
          targetFormat,
          source.constraints,
        );
        expect(
          generated.ok,
          `${fixture.id}:${targetFormat}${generated.ok ? "" : ` [${generated.code}] ${generated.message}`}`,
        ).toBe(true);
        if (!generated.ok) continue;
        const generatorExpectation =
          routeExpectation?.generatorExpectation ??
          fixture.generatorExpectations?.[generatorId(targetFormat)];
        if (generatorExpectation) {
          if (generatorExpectation.diagnosticCodes) {
            expect(
              generated.diagnostics?.map((diagnostic) => diagnostic.code) ?? [],
            ).toEqual(generatorExpectation.diagnosticCodes);
          }
          if (generatorExpectation.semanticNoteCodes) {
            expect(
              generated.semanticNotes?.map((note) => note.code) ?? [],
            ).toEqual(generatorExpectation.semanticNoteCodes);
          }
        }
        const generatedFixture = {
          ...fixture,
          sources: {
            ...fixture.sources,
            [targetFormat]: generatedSource(
              targetFormat,
              generated.output,
              fixture,
            ),
          },
        } as typeof fixture;
        const target = parseSemanticFixture(generatedFixture, targetFormat);
        expectIrEquivalent(target.document, fixture.canonicalShape);
        if (constraintPolicy === "exact") {
          expect(
            target.constraints,
            `${fixture.id}:${targetFormat}`,
          ).toBeDefined();
        }
        if (constraintPolicy === "exact" && target.constraints) {
          expectFixtureConstraintsEquivalent(
            target.constraints,
            fixture,
            targetFormat,
          );
        }
        if (constraintPolicy === "lossy") {
          expectDeclaredConstraintLoss(
            target.constraints?.entries ?? [],
            fixture,
            targetFormat,
            routeExpectation?.semanticLosses ?? [],
          );
        }
      }
    },
  );

  it("loads the unified record fixture through Zod and OpenAPI", () => {
    const fixture = sharedSemanticFixtures.find(
      (item) => item.id === "collection.record",
    );
    if (!fixture) throw new Error("record fixture is missing");

    const canonical = parseSemanticFixture(fixture, "json-schema");
    const zod = parseSemanticFixture(fixture, "zod");
    const openapi = parseSemanticFixture(fixture, "openapi");

    expectIrEquivalent(zod.document, fixture.canonicalShape);
    expectIrEquivalent(openapi.document, fixture.canonicalShape);
    expectIrEquivalent(zod.document, canonical.document);
    expectIrEquivalent(openapi.document, canonical.document);
  });

  it("compares constraint semantics while ignoring adapter diagnostics", () => {
    const fixture = sharedSemanticFixtures.find(
      (item) => item.id === "constraint.numeric-minimum",
    );
    if (!fixture?.canonicalConstraints) {
      throw new Error("numeric constraint fixture is missing");
    }

    const parsed = parseSemanticFixture(fixture, "json-schema");
    if (!parsed.constraints) throw new Error("constraints were not parsed");

    expectConstraintEquivalent(
      parsed.constraints,
      fixture.canonicalConstraints,
    );
    expectConstraintEquivalent(
      {
        ...parsed.constraints,
        entries: parsed.constraints.entries.map((entry) => ({
          ...entry,
          constraints: entry.constraints.map((constraint) => ({
            ...constraint,
            message: "different adapter wording",
            evidence: { keyword: "minimum" },
          })),
        })),
      },
      fixture.canonicalConstraints,
    );

    const variants = [
      {
        ...parsed.constraints,
        entries: parsed.constraints.entries.map((entry) => ({
          ...entry,
          target: { ...entry.target, path: ["root", "other"] },
        })),
      },
      {
        ...parsed.constraints,
        entries: parsed.constraints.entries.map((entry) => ({
          ...entry,
          target: { ...entry.target, kind: "field" as const },
        })),
      },
      {
        ...parsed.constraints,
        entries: parsed.constraints.entries.map((entry) => ({
          ...entry,
          constraints: entry.constraints.map((constraint) => ({
            ...constraint,
            kind: "maximum",
          })),
        })),
      },
      {
        ...parsed.constraints,
        entries: parsed.constraints.entries.map((entry) => ({
          ...entry,
          constraints: entry.constraints.map((constraint) => ({
            ...constraint,
            severity: "warning" as const,
          })),
        })),
      },
      {
        ...parsed.constraints,
        entries: parsed.constraints.entries.map((entry) => ({
          ...entry,
          constraints: entry.constraints.map((constraint) => ({
            ...constraint,
            value: { representation: "decimal" as const, value: "0.00" },
          })),
        })),
      },
    ];
    for (const variant of variants) {
      expect(() =>
        expectConstraintEquivalent(variant, fixture.canonicalConstraints!),
      ).toThrow();
    }
  });

  it("keeps numeric constraints equivalent across JSON Schema, Zod, and OpenAPI", () => {
    const fixture = sharedSemanticFixtures.find(
      (item) => item.id === "constraint.numeric-minimum",
    );
    if (!fixture?.canonicalConstraints) {
      throw new Error("numeric constraint fixture is missing");
    }

    for (const format of ["json-schema", "zod", "openapi"] as const) {
      const parsed = parseSemanticFixture(fixture, format);
      expect(parsed.constraints, format).toBeDefined();
      if (!parsed.constraints) continue;
      expectFixtureConstraintsEquivalent(parsed.constraints, fixture, format);
    }
  });

  it("round-trips the canonical record through Zod and OpenAPI generators", () => {
    const fixture = sharedSemanticFixtures.find(
      (item) => item.id === "collection.record",
    );
    if (!fixture) throw new Error("record fixture is missing");

    const zodOutput = tryGenerateZod(fixture.canonicalShape);
    expect(zodOutput.ok).toBe(true);
    if (!zodOutput.ok) return;
    const zodRoundTrip = parseSemanticFixture(
      {
        ...fixture,
        sources: {
          ...fixture.sources,
          zod: { input: zodOutput.output, options: { name: "Dictionary" } },
        },
      },
      "zod",
    );
    expectIrEquivalent(zodRoundTrip.document, fixture.canonicalShape);

    const openapiOutput = tryGenerateOpenApi(fixture.canonicalShape);
    expect(openapiOutput.ok).toBe(true);
    if (!openapiOutput.ok) return;
    const openapiRoundTrip = parseSemanticFixture(
      {
        ...fixture,
        sources: {
          ...fixture.sources,
          openapi: {
            input: JSON.stringify(openapiOutput.output),
            options: { name: "Dictionary", entry: "Dictionary" },
          },
        },
      },
      "openapi",
    );
    expectIrEquivalent(openapiRoundTrip.document, fixture.canonicalShape);
  });

  it("parses the shared record fixture in every programming-language adapter", () => {
    for (const format of ["rust", "python", "go", "java", "kotlin"] as const) {
      const parsed = parseSemanticFixture(crossLanguageRecordFixture, format);
      if (format === "java") {
        expectIrEquivalent(parsed.document, javaNormalizedRecordShape);
        continue;
      }
      expectIrEquivalent(
        parsed.document,
        crossLanguageRecordFixture.canonicalShape,
      );
    }
  });

  it("round-trips the portable record through every language generator", () => {
    const generators = {
      rust: (document: SchemaDocument) => tryGenerateRust(document),
      python: (document: SchemaDocument) => tryGeneratePython(document),
      go: (document: SchemaDocument) => tryGenerateGo(document),
      java: (document: SchemaDocument) => tryGenerateJava(document),
      kotlin: (document: SchemaDocument) => tryGenerateKotlin(document),
    } as const;

    for (const format of ["rust", "python", "go", "java", "kotlin"] as const) {
      const source = parseSemanticFixture(crossLanguageRecordFixture, format);
      const generated = generators[format](
        normalizeSchemaDocumentForTest(source.document),
      );
      expect(generated.ok, format).toBe(true);
      if (!generated.ok) continue;
      const parsed = parseSemanticFixture(
        {
          ...crossLanguageRecordFixture,
          sources: {
            ...crossLanguageRecordFixture.sources,
            [format]: {
              input: generated.output,
              options: { name: "User", entry: "User" },
            },
          },
        },
        format,
      );
      try {
        expectIrEquivalent(
          parsed.document,
          format === "java"
            ? javaNormalizedRecordShape
            : crossLanguageRecordFixture.canonicalShape,
        );
      } catch (error) {
        throw new Error(
          `${format}: ${error instanceof Error ? error.message : String(error)}`,
          { cause: error },
        );
      }
    }
  });
});

function generateForSchemaFormat(
  document: SchemaDocument,
  format: "json-schema" | "typescript" | "zod" | "openapi",
  constraints?: ConstraintDocument,
) {
  switch (format) {
    case "json-schema":
      return tryGenerateJsonSchema(
        document,
        constraints ? { constraints } : {},
      );
    case "typescript":
      return tryGenerateTypeScript(document);
    case "zod":
      return tryGenerateZod(document, {
        ...(constraints ? { constraints } : {}),
        outputLanguage: "javascript",
      });
    case "openapi":
      return tryGenerateOpenApi(document, constraints ? { constraints } : {});
  }
}

function generatorId(format: "json-schema" | "typescript" | "zod" | "openapi") {
  return `generator:${format}` as const;
}

function expectDeclaredConstraintLoss(
  actualEntries: ConstraintDocument["entries"],
  fixture: (typeof sharedSemanticFixtures)[number],
  format: "json-schema" | "typescript" | "zod" | "openapi",
  losses: Array<{ lostCapability: ConversionCapability; sourcePath: string[] }>,
): void {
  const canonical = fixture.canonicalConstraints;
  if (!canonical) return;
  const normalization = fixture.constraintPathNormalizations?.[format];

  for (const loss of losses) {
    const canonicalEntries = canonical.entries.filter(
      (entry) =>
        entry.target.path.length === loss.sourcePath.length &&
        entry.target.path.every(
          (part, index) => part === loss.sourcePath[index],
        ),
    );
    expect(
      canonicalEntries.length,
      `${fixture.id}: declared loss path does not exist in canonical constraints`,
    ).toBeGreaterThan(0);

    const expectedConstraints = canonicalEntries.flatMap((entry) =>
      entry.constraints
        .filter((constraint) =>
          constraintMatchesCapability(constraint.kind, loss.lostCapability),
        )
        .map((constraint) => ({
          targetKind: entry.target.kind,
          constraint,
        })),
    );
    expect(
      expectedConstraints.length,
      `${fixture.id}: declared ${loss.lostCapability} has no matching canonical constraints`,
    ).toBeGreaterThan(0);
    const targetLocations = canonicalEntries.map((entry) => ({
      kind: entry.target.kind,
      path: normalization
        ? replacePath(
            entry.target.path,
            normalization.replacePrefix,
            normalization.replacement,
          )
        : entry.target.path,
    }));
    const retained = expectedConstraints.some(({ targetKind, constraint }) =>
      targetLocations.some(
        ({ kind, path }) =>
          kind === targetKind &&
          actualEntries.some(
            (entry) =>
              entry.target.kind === kind &&
              entry.target.path.length === path.length &&
              entry.target.path.every((part, index) => part === path[index]) &&
              entry.constraints.some(
                (candidate) =>
                  candidate.kind === constraint.kind &&
                  candidate.severity === constraint.severity &&
                  stableConstraintValue(candidate.value) ===
                    stableConstraintValue(constraint.value),
              ),
          ),
      ),
    );
    expect(
      retained,
      `${fixture.id}: declared ${loss.lostCapability} loss at ${loss.sourcePath.join(".")} was not observed`,
    ).toBe(false);
  }
}

function constraintKindsForCapability(
  capability: ConversionCapability,
): Set<string> {
  switch (capability) {
    case "numeric-constraints":
      return new Set([
        "minimum",
        "maximum",
        "exclusive-minimum",
        "exclusive-maximum",
        "multiple-of",
      ]);
    case "string-constraints":
      return new Set(["min-length", "max-length", "pattern"]);
    case "collection-constraints":
      return new Set([
        "min-items",
        "max-items",
        "unique-items",
        "min-properties",
        "max-properties",
      ]);
    case "constraint-ir":
      return new Set(["*"]);
    case "object-constraints":
      return new Set([
        "min-properties",
        "max-properties",
        "read-only",
        "write-only",
        "closed-object",
      ]);
    default:
      throw new Error(`Unsupported constraint loss capability: ${capability}`);
  }
}

function constraintMatchesCapability(
  kind: string,
  capability: ConversionCapability,
): boolean {
  const kinds = constraintKindsForCapability(capability);
  return kinds.has("*") || kinds.has(kind);
}

function stableConstraintValue(value: unknown): string {
  if (Array.isArray(value))
    return `[${value.map(stableConstraintValue).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(
        ([key, item]) =>
          `${JSON.stringify(key)}:${stableConstraintValue(item)}`,
      )
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

function replacePath(
  path: string[],
  prefix: string[],
  replacement: string[],
): string[] {
  expect(path.slice(0, prefix.length)).toEqual(prefix);
  return [...replacement, ...path.slice(prefix.length)];
}

function generatedSource(
  format: "json-schema" | "typescript" | "zod" | "openapi",
  output: unknown,
  fixture: { canonicalShape: { name: { source: string } } },
) {
  const name = fixture.canonicalShape.name.source;
  if (format === "json-schema") {
    return { input: output, options: { name } };
  }
  if (format === "openapi") {
    return {
      input: JSON.stringify(output),
      options: { name, entry: name },
    };
  }
  if (format === "zod") {
    return {
      input: String(output),
      options: { name, entry: `${name}Schema` },
    };
  }
  return { input: String(output), options: { name, entry: name } };
}
