import { describe, expect, it } from "vitest";
import { tryGenerateJsonSchema } from "@schema-transformation-toolkit/generator-json-schema";
import { tryGenerateOpenApi } from "@schema-transformation-toolkit/generator-openapi";
import { tryGenerateTypeScript } from "@schema-transformation-toolkit/generator-typescript";
import { tryGenerateZod } from "@schema-transformation-toolkit/generator-zod";
import { convert } from "@schema-transformation-toolkit/sdk";
import { tryGenerateGo } from "../../packages/generators/go/src/api.js";
import { tryGenerateRust } from "../../packages/generators/rust/src/api.js";
import type {
  SchemaDocument,
  SchemaNode,
} from "@schema-transformation-toolkit/core";
import {
  sharedSemanticFixtures,
  selectEquivalenceFixtures,
} from "../fixtures/semantics/index.js";
import type {
  SemanticFixture,
  SemanticFixtureRouteId,
} from "../fixtures/semantics/types.js";
import {
  expectIrEquivalent,
  expectFixtureConstraintsEquivalent,
  normalizeSchemaDocumentForTest,
} from "../helpers/schema-equivalence.js";
import { parseSemanticFixture } from "../helpers/semantic-fixture-parser.js";

type GoRouteFormat =
  "go" | "json-schema" | "typescript" | "zod" | "openapi" | "rust";

const goRoutes = [
  ["go", "json-schema"],
  ["json-schema", "go"],
  ["go", "typescript"],
  ["typescript", "go"],
  ["go", "zod"],
  ["zod", "go"],
  ["go", "openapi"],
  ["openapi", "go"],
  ["go", "rust"],
  ["rust", "go"],
] as const;

describe("equivalence: Go V1 routes", () => {
  it.each(goRoutes)(
    "executes %s -> %s for all eligible fixtures",
    (sourceFormat, targetFormat) => {
      const route =
        `${sourceFormat}->${targetFormat}` as SemanticFixtureRouteId;
      const eligibleFixtures = selectEquivalenceFixtures(
        sharedSemanticFixtures,
        sourceFormat,
        targetFormat,
      );
      expect(
        eligibleFixtures.filter(
          (fixture) => !fixture.equivalenceRoutes?.includes(route),
        ),
        `Every eligible fixture must explicitly declare ${route}`,
      ).toEqual([]);
      expect(
        eligibleFixtures.length,
        `No fixture supports ${route}`,
      ).toBeGreaterThan(0);

      for (const fixture of eligibleFixtures) {
        runGoSemanticRoute(fixture, sourceFormat, targetFormat, route);
      }
    },
  );
});

function runGoSemanticRoute(
  fixture: SemanticFixture,
  sourceFormat: GoRouteFormat,
  targetFormat: GoRouteFormat,
  route: SemanticFixtureRouteId,
): void {
  const source = parseSemanticFixture(fixture, sourceFormat);
  expectGoRouteEquivalent(
    source.document,
    fixture.canonicalShape,
    sourceFormat,
    fixture,
  );
  if (fixture.canonicalConstraints && sourceFormat !== "go") {
    expect(
      source.constraints,
      `${fixture.id}: ${sourceFormat} must produce Constraint IR`,
    ).toBeDefined();
    if (!source.constraints) return;
    expectFixtureConstraintsEquivalent(
      source.constraints,
      fixture,
      sourceFormat,
    );
  }

  const sourceDocument =
    sourceFormat === "go"
      ? normalizeGoDocument(
          source.document,
          fixture.support.go === "normalized",
        )
      : normalizeSchemaDocumentForTest(source.document);
  const generated = generateTarget(sourceDocument, targetFormat);
  expect(generated.ok, `${fixture.id}: ${route}`).toBe(true);
  if (!generated.ok) return;

  if (fixture.canonicalConstraints && targetFormat === "go") {
    expectGoRouteLoss(fixture, sourceFormat, route, source.constraints);
  }

  const target = parseSemanticFixture(
    {
      ...fixture,
      sources: {
        ...fixture.sources,
        [targetFormat]: generatedSource(
          targetFormat,
          generated.output,
          fixture.canonicalShape,
        ),
      },
    },
    targetFormat,
  );
  if (fixture.canonicalConstraints && targetFormat === "go") {
    expect(
      target.constraints,
      `${fixture.id}: Go target must not fabricate Constraint IR`,
    ).toBeUndefined();
  }
  try {
    expectGoRouteEquivalent(
      target.document,
      fixture.canonicalShape,
      targetFormat,
      fixture,
    );
  } catch (error) {
    throw new Error(`${fixture.id}: ${route}: ${String(error)}`, {
      cause: error,
    });
  }
}

function expectGoRouteLoss(
  fixture: SemanticFixture,
  sourceFormat: GoRouteFormat,
  route: SemanticFixtureRouteId,
  sourceConstraints:
    ReturnType<typeof parseSemanticFixture>["constraints"] | undefined,
): void {
  const expected = fixture.conversionExpectations?.[route]?.semanticLosses;
  expect(
    expected,
    `${fixture.id}: ${route} requires an explicit constraint loss expectation`,
  ).toBeDefined();
  if (!expected) return;

  const source = fixture.sources[sourceFormat];
  expect(source, `${fixture.id}: missing ${sourceFormat} source`).toBeDefined();
  if (!source) return;
  const input =
    sourceFormat === "json-schema"
      ? JSON.stringify(source.input)
      : String(source.input);
  const result = convert({
    sourceFormat,
    targetFormat: "go",
    input,
    name: fixture.canonicalShape.name.source,
    includeArtifacts: true,
  });
  expect(result.ok, `${fixture.id}: ${route}: ${JSON.stringify(result)}`).toBe(
    true,
  );
  if (!result.ok) return;

  expect(sourceConstraints).toBeDefined();
  if (!sourceConstraints) return;
  const findConstraint = (path: string[], kind: string) =>
    sourceConstraints.entries
      .find((entry) => pathsEqual(entry.target.path, path))
      ?.constraints.find((constraint) => constraint.kind === kind);
  const findEntry = (path: string[]) =>
    sourceConstraints.entries.find((entry) =>
      pathsEqual(entry.target.path, path),
    );
  const actual = (result.losses ?? [])
    .map((loss) => ({
      lostCapability: loss.lostCapability,
      sourcePath: loss.sourcePath ?? [],
      constraintKind:
        typeof loss.evidence === "object" &&
        loss.evidence !== null &&
        "constraintKind" in loss.evidence
          ? String(loss.evidence.constraintKind)
          : undefined,
      targetKind:
        typeof loss.evidence === "object" &&
        loss.evidence !== null &&
        "targetKind" in loss.evidence
          ? String(loss.evidence.targetKind)
          : undefined,
      value: (() => {
        const evidence = loss.evidence;
        const kind =
          typeof evidence === "object" &&
          evidence !== null &&
          "constraintKind" in evidence
            ? String(evidence.constraintKind)
            : undefined;
        return kind
          ? findConstraint(loss.sourcePath ?? [], kind)?.value
          : undefined;
      })(),
    }))
    .sort((left, right) =>
      JSON.stringify(left).localeCompare(JSON.stringify(right)),
    );
  const normalizedExpected = expected
    .flatMap(({ lostCapability, sourcePath }) => {
      const constraints = sourceConstraints.entries.find((entry) =>
        pathsEqual(entry.target.path, sourcePath),
      )?.constraints;
      const targetKind = findEntry(sourcePath)?.target.kind;
      expect(
        constraints,
        `${fixture.id}: ${route} has no constraint at ${sourcePath.join(".")}`,
      ).toBeDefined();
      return (constraints ?? []).map((constraint) => ({
        lostCapability,
        sourcePath,
        constraintKind: constraint.kind,
        targetKind,
        value: constraint.value,
      }));
    })
    .sort((left, right) =>
      JSON.stringify(left).localeCompare(JSON.stringify(right)),
    );
  expect(actual, `${fixture.id}: ${route} loss mismatch`).toEqual(
    normalizedExpected,
  );
}

function pathsEqual(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    left.every((part, index) => part === right[index])
  );
}

function expectGoRouteEquivalent(
  actual: SchemaDocument,
  expected: SchemaDocument,
  format: GoRouteFormat,
  fixture: SemanticFixture,
): void {
  if (format !== "go") {
    expectIrEquivalent(actual, expected);
    return;
  }
  const normalizedActual = normalizeGoDocument(
    actual,
    fixture.support.go === "normalized",
  );
  const normalizedExpected = normalizeGoDocument(
    expected,
    fixture.support.go === "normalized",
  );
  try {
    expectIrEquivalent(normalizedActual, normalizedExpected);
  } catch (error) {
    throw new Error(
      `Go IR mismatch for ${fixture.id}:\nactual=${JSON.stringify(normalizedActual)}\nexpected=${JSON.stringify(normalizedExpected)}`,
      { cause: error },
    );
  }
}

function normalizeGoDocument(
  document: SchemaDocument,
  normalizeOptionalPointer: boolean,
): SchemaDocument {
  const normalized = normalizeSchemaDocumentForTest(document);
  return {
    ...normalized,
    root: normalizeGoNode(normalized.root, normalizeOptionalPointer),
    definitions: normalized.definitions.map((definition) => ({
      ...definition,
      type: normalizeGoNode(definition.type, normalizeOptionalPointer),
    })),
  };
}

function normalizeGoNode(
  node: SchemaNode,
  normalizeOptionalPointer: boolean,
): SchemaNode {
  switch (node.kind) {
    case "scalar": {
      return { kind: "scalar", scalar: node.scalar };
    }
    case "array":
      return {
        ...node,
        elementType: normalizeGoNode(
          node.elementType,
          normalizeOptionalPointer,
        ),
      };
    case "record":
      return {
        ...node,
        key: normalizeGoNode(node.key, normalizeOptionalPointer),
        value: normalizeGoNode(node.value, normalizeOptionalPointer),
      };
    case "object":
      return {
        ...node,
        fields: node.fields.map((field) => ({
          ...field,
          nullable:
            normalizeOptionalPointer && !field.required
              ? false
              : field.nullable,
          type: normalizeGoNode(field.type, normalizeOptionalPointer),
        })),
      };
    case "union":
      return {
        ...node,
        members: node.members.map((member) =>
          normalizeGoNode(member, normalizeOptionalPointer),
        ),
      };
    default:
      return node;
  }
}

function generateTarget(
  document: ReturnType<typeof normalizeSchemaDocumentForTest>,
  targetFormat: GoRouteFormat,
) {
  const normalized = normalizeSchemaDocumentForTest(document);
  switch (targetFormat) {
    case "go":
      return tryGenerateGo(normalized);
    case "json-schema":
      return tryGenerateJsonSchema(normalized);
    case "typescript":
      return tryGenerateTypeScript(normalized);
    case "zod":
      return tryGenerateZod(normalized, { outputLanguage: "javascript" });
    case "openapi":
      return tryGenerateOpenApi(normalized);
    case "rust":
      return tryGenerateRust(normalized);
  }
}

function generatedSource(
  format: GoRouteFormat,
  output: unknown,
  canonical: SemanticFixture["canonicalShape"],
) {
  const name = canonical.name.source;
  const entry =
    canonical.rootName?.source ??
    (canonical.root.kind === "reference" ? canonical.root.name : name);
  if (format === "json-schema") return { input: output, options: { name } };
  if (format === "openapi") {
    return {
      input: JSON.stringify(output),
      options: { name, entry },
    };
  }
  if (format === "zod") {
    return {
      input: String(output),
      options: { name, entry: `${entry}Schema` },
    };
  }
  return { input: String(output), options: { name, entry } };
}
