import { describe, expect, it } from "vitest";
import {
  schemaDocument,
  schemaFieldNode,
  schemaObjectNode,
  schemaScalarNode,
  schemaUnionNode,
  schemaUnknownNode,
} from "@aio/core";
import {
  generateJsonSchema,
  tryGenerateJsonSchema,
} from "@aio/generator-json-schema";
import {
  sharedSemanticFixtures,
  unknownRootFixture,
} from "../../fixtures/semantics/index.js";
import { expectValidGeneratedJsonSchema } from "../../helpers/json-schema-structure.js";

describe("generator-json-schema structure validity", () => {
  it("renders structurally valid JSON Schema for the shared canonical semantic fixtures", () => {
    for (const fixture of sharedSemanticFixtures) {
      const output = generateJsonSchema(fixture.canonicalShape);

      expectValidGeneratedJsonSchema(output);
    }
  });

  it('renders structurally valid JSON Schema when objectAdditionalPropertiesMode is "false"', () => {
    const output = generateJsonSchema(
      schemaDocument(
        "ClosedUser",
        schemaObjectNode([schemaFieldNode("id", schemaScalarNode("integer"))]),
      ),
      {
        objectAdditionalPropertiesMode: "false",
      },
    );

    expect(output).toHaveProperty("additionalProperties", false);
    expectValidGeneratedJsonSchema(output);
  });

  it('renders structurally valid JSON Schema when unionComposition is "anyOf"', () => {
    const output = generateJsonSchema(
      schemaDocument(
        "MaybeString",
        schemaUnionNode([
          schemaScalarNode("string"),
          schemaScalarNode("number"),
        ]),
      ),
      {
        unionComposition: "anyOf",
      },
    );

    expect(output).toHaveProperty("anyOf");
    expectValidGeneratedJsonSchema(output);
  });

  it("keeps success-with-diagnostics outputs structurally valid for wide unknown semantics", () => {
    const result = tryGenerateJsonSchema(unknownRootFixture.canonicalShape);

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error(
        "Expected unknown fixture JSON Schema generation to succeed.",
      );
    }

    expect(result.diagnostics).toBeDefined();
    expectValidGeneratedJsonSchema(result.output);
  });

  it("keeps structurally valid output when unknown members widen union semantics", () => {
    const result = tryGenerateJsonSchema(
      schemaDocument(
        "WideValues",
        schemaUnionNode([
          schemaScalarNode("string"),
          schemaUnknownNode({
            reason: "no-evidence",
          }),
        ]),
      ),
    );

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error("Expected wide union JSON Schema generation to succeed.");
    }

    expectValidGeneratedJsonSchema(result.output);
  });
});
