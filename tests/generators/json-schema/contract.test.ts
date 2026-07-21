import { describe, expect, it } from "vitest";
import { tryGenerateJsonSchema } from "@aio/generator-json-schema";
import { sharedSemanticFixtures } from "../../fixtures/semantics/index.js";
import {
  expectDiagnosticCodes,
  expectSemanticNoteCodes,
} from "../../helpers/diagnostic-assertions.js";
import {
  findFixture,
  getFixtureDocument,
  getRequiredFixtureConstraints,
} from "../../helpers/generator-contract.js";
import { expectValidGeneratedJsonSchema } from "../../helpers/json-schema-structure.js";

describe("generator-json-schema contract", () => {
  for (const fixture of sharedSemanticFixtures) {
    it(`renders structurally valid JSON Schema for ${fixture.id}`, () => {
      const result = tryGenerateJsonSchema(getFixtureDocument(fixture));

      expect(result.ok).toBe(true);

      if (!result.ok) {
        throw new Error(
          `Expected JSON Schema generation for fixture "${fixture.id}" to succeed.`,
        );
      }

      expectValidGeneratedJsonSchema(result.output);
    });
  }

  const truthfulnessFixtures = sharedSemanticFixtures.filter(
    (fixture) => fixture.generatorExpectations?.["generator:json-schema"],
  );

  for (const fixture of truthfulnessFixtures) {
    it(`keeps generator truthfulness explicit for ${fixture.id}`, () => {
      const result = tryGenerateJsonSchema(getFixtureDocument(fixture));
      const expectation =
        fixture.generatorExpectations?.["generator:json-schema"];

      expect(result.ok).toBe(true);

      if (!result.ok || !expectation) {
        throw new Error(
          `Expected JSON Schema generator truthfulness fixture "${fixture.id}" to succeed.`,
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
      expectValidGeneratedJsonSchema(result.output);
    });
  }

  it("keeps local-definition references renderable as top-level $ref documents", () => {
    const fixture = findFixture(
      sharedSemanticFixtures,
      "reference.local-reference",
    );
    const result = tryGenerateJsonSchema(getFixtureDocument(fixture));

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error(
        "Expected local-reference JSON Schema generation to succeed.",
      );
    }

    expect(result.output).toHaveProperty("$ref", "#/$defs/Response");
    expectValidGeneratedJsonSchema(result.output);
  });

  it("re-emits shared constraint and annotation fixtures through the generator constraints option", () => {
    const minLengthFixture = findFixture(
      sharedSemanticFixtures,
      "constraint.string-min-length",
    );
    const closedObjectFixture = findFixture(
      sharedSemanticFixtures,
      "constraint.closed-object",
    );
    const descriptionFixture = findFixture(
      sharedSemanticFixtures,
      "annotation.description",
    );
    const referencedMinLengthFixture = findFixture(
      sharedSemanticFixtures,
      "reference.constraint-min-length",
    );
    const referencedDescriptionFixture = findFixture(
      sharedSemanticFixtures,
      "reference.annotation-description",
    );
    const stringAnnotationBundleFixture = findFixture(
      sharedSemanticFixtures,
      "constraint.annotation-string-bundle",
    );
    const collectionBundleFixture = findFixture(
      sharedSemanticFixtures,
      "constraint.collection-bundle",
    );
    const minimumFixture = findFixture(
      sharedSemanticFixtures,
      "constraint.numeric-minimum",
    );
    const minItemsFixture = findFixture(
      sharedSemanticFixtures,
      "constraint.array-min-items",
    );

    const minLengthResult = tryGenerateJsonSchema(
      getFixtureDocument(minLengthFixture),
      {
        constraints: getRequiredFixtureConstraints(minLengthFixture),
      },
    );
    const closedObjectResult = tryGenerateJsonSchema(
      getFixtureDocument(closedObjectFixture),
      {
        constraints: getRequiredFixtureConstraints(closedObjectFixture),
      },
    );
    const descriptionResult = tryGenerateJsonSchema(
      getFixtureDocument(descriptionFixture),
      {
        constraints: getRequiredFixtureConstraints(descriptionFixture),
      },
    );
    const referencedMinLengthResult = tryGenerateJsonSchema(
      getFixtureDocument(referencedMinLengthFixture),
      {
        constraints: getRequiredFixtureConstraints(referencedMinLengthFixture),
      },
    );
    const referencedDescriptionResult = tryGenerateJsonSchema(
      getFixtureDocument(referencedDescriptionFixture),
      {
        constraints: getRequiredFixtureConstraints(
          referencedDescriptionFixture,
        ),
      },
    );
    const stringAnnotationBundleResult = tryGenerateJsonSchema(
      getFixtureDocument(stringAnnotationBundleFixture),
      {
        constraints: getRequiredFixtureConstraints(
          stringAnnotationBundleFixture,
        ),
      },
    );
    const collectionBundleResult = tryGenerateJsonSchema(
      getFixtureDocument(collectionBundleFixture),
      {
        constraints: getRequiredFixtureConstraints(collectionBundleFixture),
      },
    );
    const minimumResult = tryGenerateJsonSchema(
      getFixtureDocument(minimumFixture),
      {
        constraints: getRequiredFixtureConstraints(minimumFixture),
      },
    );
    const minItemsResult = tryGenerateJsonSchema(
      getFixtureDocument(minItemsFixture),
      {
        constraints: getRequiredFixtureConstraints(minItemsFixture),
      },
    );

    expect(minLengthResult.ok).toBe(true);
    expect(closedObjectResult.ok).toBe(true);
    expect(descriptionResult.ok).toBe(true);
    expect(referencedMinLengthResult.ok).toBe(true);
    expect(referencedDescriptionResult.ok).toBe(true);
    expect(stringAnnotationBundleResult.ok).toBe(true);
    expect(collectionBundleResult.ok).toBe(true);
    expect(minimumResult.ok).toBe(true);
    expect(minItemsResult.ok).toBe(true);

    if (
      !minLengthResult.ok ||
      !closedObjectResult.ok ||
      !descriptionResult.ok ||
      !referencedMinLengthResult.ok ||
      !referencedDescriptionResult.ok ||
      !stringAnnotationBundleResult.ok ||
      !collectionBundleResult.ok ||
      !minimumResult.ok ||
      !minItemsResult.ok
    ) {
      throw new Error("Expected JSON Schema constraint fixtures to generate.");
    }

    expect(minLengthResult.output).toMatchObject({
      properties: {
        code: {
          minLength: 2,
        },
      },
    });
    expect(closedObjectResult.output).toMatchObject({
      additionalProperties: false,
    });
    expect(descriptionResult.output).toMatchObject({
      description: "User constraints",
    });
    expect(referencedMinLengthResult.output).toMatchObject({
      $defs: {
        User: {
          properties: {
            code: {
              minLength: 2,
            },
          },
        },
      },
    });
    expect(referencedDescriptionResult.output).toMatchObject({
      $defs: {
        User: {
          description: "Reusable user definition",
          properties: {
            code: {
              description: "User code",
            },
          },
        },
      },
    });
    expect(stringAnnotationBundleResult.output).toMatchObject({
      properties: {
        code: {
          pattern: "^[A-Z]+$",
          maxLength: 8,
          default: "ABCD",
          examples: ["EFGH"],
          readOnly: true,
          description: "Uppercase code",
        },
      },
    });
    expect(collectionBundleResult.output).toMatchObject({
      properties: {
        tags: {
          minItems: 1,
          maxItems: 3,
          uniqueItems: true,
          description: "User tags",
        },
      },
    });
    expect(minimumResult.output).toMatchObject({
      properties: {
        score: {
          minimum: 0,
        },
      },
    });
    expect(minItemsResult.output).toMatchObject({
      properties: {
        tags: {
          minItems: 1,
        },
      },
    });
    expectValidGeneratedJsonSchema(minLengthResult.output);
    expectValidGeneratedJsonSchema(closedObjectResult.output);
    expectValidGeneratedJsonSchema(descriptionResult.output);
    expectValidGeneratedJsonSchema(referencedMinLengthResult.output);
    expectValidGeneratedJsonSchema(referencedDescriptionResult.output);
    expectValidGeneratedJsonSchema(stringAnnotationBundleResult.output);
    expectValidGeneratedJsonSchema(collectionBundleResult.output);
    expectValidGeneratedJsonSchema(minimumResult.output);
    expectValidGeneratedJsonSchema(minItemsResult.output);
  });
});
