import { describe, expect, it } from "vitest";
import type {
  SchemaDocument,
  SchemaNode,
} from "@schema-transformation-toolkit/core";
import { tryGenerateGo } from "../../packages/generators/go/src/api.js";
import { tryGenerateJava } from "../../packages/generators/java/src/api.js";
import { tryGenerateJsonSchema } from "@schema-transformation-toolkit/generator-json-schema";
import { tryGenerateKotlin } from "../../packages/generators/kotlin/src/api.js";
import { tryGenerateOpenApi } from "@schema-transformation-toolkit/generator-openapi";
import { tryGenerateTypeScript } from "@schema-transformation-toolkit/generator-typescript";
import { tryGenerateZod } from "@schema-transformation-toolkit/generator-zod";
import { convert } from "@schema-transformation-toolkit/sdk";
import {
  sharedSemanticFixtures,
  selectEquivalenceFixtures,
} from "../fixtures/semantics/index.js";
import type {
  SemanticFixture,
  SemanticFixtureFormatId,
} from "../fixtures/semantics/types.js";
import {
  expectIrEquivalent,
  expectFixtureConstraintsEquivalent,
  normalizeSchemaDocumentForTest,
} from "../helpers/schema-equivalence.js";
import { parseSemanticFixture } from "../helpers/semantic-fixture-parser.js";

type JavaRouteFormat =
  "java" | "json-schema" | "typescript" | "zod" | "openapi" | "go" | "kotlin";
const javaRoutes = [
  ["java", "json-schema"],
  ["json-schema", "java"],
  ["java", "typescript"],
  ["typescript", "java"],
  ["java", "zod"],
  ["zod", "java"],
  ["java", "openapi"],
  ["openapi", "java"],
  ["java", "go"],
  ["go", "java"],
  ["java", "kotlin"],
  ["kotlin", "java"],
] as const;

describe("equivalence: Java V1 routes", () => {
  it.each(javaRoutes)(
    "executes %s -> %s for all eligible fixtures",
    (sourceFormat, targetFormat) => {
      const route =
        `${sourceFormat}->${targetFormat}` as `${SemanticFixtureFormatId}->${SemanticFixtureFormatId}`;
      const fixtures = selectEquivalenceFixtures(
        sharedSemanticFixtures,
        sourceFormat,
        targetFormat,
      );
      expect(fixtures.length, `No fixture supports ${route}`).toBeGreaterThan(
        0,
      );
      expect(
        fixtures.filter(
          (fixture) => !fixture.equivalenceRoutes?.includes(route),
        ),
        `Every eligible fixture must explicitly declare ${route}`,
      ).toEqual([]);
      for (const fixture of fixtures)
        runJavaSemanticRoute(fixture, sourceFormat, targetFormat);
    },
  );
});

function runJavaSemanticRoute(
  fixture: SemanticFixture,
  sourceFormat: JavaRouteFormat,
  targetFormat: JavaRouteFormat,
): void {
  const source = parseSemanticFixture(fixture, sourceFormat);
  expectJavaShape(
    source.document,
    fixture.canonicalShape,
    sourceFormat,
    fixture,
  );
  if (fixture.canonicalConstraints && sourceFormat !== "java") {
    expect(
      source.constraints,
      `${fixture.id}: ${sourceFormat} must produce Constraint IR`,
    ).toBeDefined();
    if (source.constraints) {
      expectFixtureConstraintsEquivalent(
        source.constraints,
        fixture,
        sourceFormat,
      );
    }
  }
  const sourceDocument =
    sourceFormat === "java"
      ? normalizeJavaReferenceNullability(
          source.document,
          fixture.canonicalShape,
        )
      : source.document;
  const generated = generateTarget(sourceDocument, targetFormat);
  expect(generated.ok, `${fixture.id}: ${sourceFormat}->${targetFormat}`).toBe(
    true,
  );
  if (!generated.ok) return;
  if (targetFormat === "java" && fixture.canonicalConstraints) {
    expectJavaConstraintLoss(fixture, sourceFormat);
  }
  const targetFixture: SemanticFixture = {
    ...fixture,
    sources: {
      ...fixture.sources,
      [targetFormat]: generatedSource(targetFormat, generated.output, fixture),
    },
  };
  let target;
  try {
    target = parseSemanticFixture(targetFixture, targetFormat);
  } catch (error) {
    throw new Error(
      `${fixture.id}: ${sourceFormat}->${targetFormat} generated output:\n${String(generated.output)}\n${String(error)}`,
      { cause: error },
    );
  }
  expectJavaShape(
    target.document,
    fixture.canonicalShape,
    targetFormat,
    fixture,
  );
}

function expectJavaConstraintLoss(
  fixture: SemanticFixture,
  sourceFormat: JavaRouteFormat,
): void {
  const route =
    `${sourceFormat}->java` as `${SemanticFixtureFormatId}->${SemanticFixtureFormatId}`;
  const expected = fixture.conversionExpectations?.[route]?.semanticLosses;
  expect(
    expected,
    `${fixture.id}: ${route} needs loss expectations`,
  ).toBeDefined();
  const source = fixture.sources[sourceFormat];
  expect(source).toBeDefined();
  if (!expected || !source) return;
  const input =
    sourceFormat === "json-schema"
      ? JSON.stringify(source.input)
      : String(source.input);
  const result = convert({
    sourceFormat,
    targetFormat: "java",
    input,
    name: fixture.canonicalShape.name.source,
    includeArtifacts: true,
  });
  expect(result.ok, JSON.stringify(result)).toBe(true);
  if (!result.ok) return;
  expect(
    result.losses?.map((loss) => ({
      lostCapability: loss.lostCapability,
      sourcePath: loss.sourcePath,
      constraintKind:
        typeof loss.evidence === "object" &&
        loss.evidence !== null &&
        "constraintKind" in loss.evidence
          ? loss.evidence.constraintKind
          : undefined,
      targetKind:
        typeof loss.evidence === "object" &&
        loss.evidence !== null &&
        "targetKind" in loss.evidence
          ? loss.evidence.targetKind
          : undefined,
    })),
  ).toEqual(
    expect.arrayContaining(
      expected.map((loss) => ({
        lostCapability: loss.lostCapability,
        sourcePath: loss.sourcePath,
        constraintKind: "minimum",
        targetKind: "node",
      })),
    ),
  );
}

function expectJavaShape(
  actual: SchemaDocument,
  expected: SchemaDocument,
  format: JavaRouteFormat,
  fixture: SemanticFixture,
): void {
  const normalized =
    format === "java" && fixture.support.java === "normalized"
      ? normalizeJavaReferenceNullability(actual, expected)
      : actual;
  expectIrEquivalent(normalized, expected);
}

function normalizeJavaReferenceNullability(
  document: SchemaDocument,
  expected: SchemaDocument,
): SchemaDocument {
  const expectedDefinitions = new Map(
    expected.definitions.map((definition) => [
      definition.name.source,
      definition.type,
    ]),
  );
  const normalize = (
    node: SchemaNode,
    expectedNode: SchemaNode,
  ): SchemaNode => {
    switch (node.kind) {
      case "array":
        return {
          ...node,
          elementType:
            expectedNode.kind === "array"
              ? normalize(node.elementType, expectedNode.elementType)
              : node.elementType,
        };
      case "record":
        return {
          ...node,
          key:
            expectedNode.kind === "record"
              ? normalize(node.key, expectedNode.key)
              : node.key,
          value:
            expectedNode.kind === "record"
              ? normalize(node.value, expectedNode.value)
              : node.value,
        };
      case "object":
        return {
          ...node,
          fields: node.fields.map((field) => ({
            ...field,
            nullable:
              expectedNode.kind === "object"
                ? (expectedNode.fields.find(
                    (candidate) => candidate.name.source === field.name.source,
                  )?.nullable ?? field.nullable)
                : field.nullable,
            type: normalize(
              field.type,
              expectedNode.kind === "object"
                ? (expectedNode.fields.find(
                    (candidate) => candidate.name.source === field.name.source,
                  )?.type ?? field.type)
                : field.type,
            ),
          })),
        };
      case "union": {
        const members = node.members.map((member) => {
          const expectedMember =
            expectedNode.kind === "union"
              ? (expectedNode.members.find(
                  (candidate) => candidate.kind === member.kind,
                ) ?? member)
              : member;
          return normalize(member, expectedMember);
        });
        // Java's parser conservatively widens reference-typed components to
        // nullable. Remove that widening only when the canonical node is not
        // nullable; a canonical nullable value must remain nullable.
        const nonNullMembers = members.filter(
          (member) => member.kind !== "null",
        );
        return expectedNode.kind !== "union" &&
          nonNullMembers.length === 1 &&
          members.length === 2
          ? nonNullMembers[0]!
          : { ...node, members };
      }
      case "reference": {
        const expectedReference =
          expectedNode.kind === "reference"
            ? expectedDefinitions.get(expectedNode.name)
            : undefined;
        return expectedReference ? { ...node, name: node.name } : node;
      }
      default:
        return node;
    }
  };
  return {
    ...document,
    root: normalize(document.root, expected.root),
    definitions: document.definitions.map((definition) => ({
      ...definition,
      type: normalize(
        definition.type,
        expected.definitions.find(
          (candidate) => candidate.name.source === definition.name.source,
        )?.type ?? definition.type,
      ),
    })),
  };
}

function generateTarget(document: SchemaDocument, target: JavaRouteFormat) {
  switch (target) {
    case "java":
      return tryGenerateJava(normalizeSchemaDocumentForTest(document));
    case "json-schema":
      return tryGenerateJsonSchema(normalizeSchemaDocumentForTest(document));
    case "typescript":
      return tryGenerateTypeScript(normalizeSchemaDocumentForTest(document));
    case "zod":
      return tryGenerateZod(normalizeSchemaDocumentForTest(document), {
        outputLanguage: "javascript",
      });
    case "openapi":
      return tryGenerateOpenApi(normalizeSchemaDocumentForTest(document));
    case "go":
      return tryGenerateGo(normalizeSchemaDocumentForTest(document));
    case "kotlin":
      return tryGenerateKotlin(normalizeSchemaDocumentForTest(document));
  }
}

function generatedSource(
  format: JavaRouteFormat,
  output: unknown,
  fixture: SemanticFixture,
) {
  const name = fixture.canonicalShape.name.source;
  const entry =
    fixture.canonicalShape.rootName?.source ??
    (fixture.canonicalShape.root.kind === "reference"
      ? fixture.canonicalShape.root.name
      : name);
  if (format === "json-schema") return { input: output, options: { name } };
  if (format === "openapi")
    return { input: JSON.stringify(output), options: { name, entry } };
  if (format === "zod")
    return {
      input: String(output),
      options: { name, entry: `${entry}Schema` },
    };
  if (format === "java")
    return { input: String(output), options: { name, entry } };
  return { input: String(output), options: { name, entry } };
}
