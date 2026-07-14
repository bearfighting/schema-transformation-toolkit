import { describe, expect, it } from "vitest";
import {
  tryValidateSchemaDocument,
  tryValidateSchemaFieldNullability,
  validateSchemaDocument,
  validateSchemaFieldNullability,
  schemaDefinition,
  schemaFieldNode,
  schemaNullNode,
  schemaObjectNode,
  schemaReferenceNode,
  schemaScalarNode,
  schemaUnionNode,
  schemaUnknownNode,
} from "../../packages/core/src/index.js";
import { areEquivalentSchemaNodes } from "../../packages/core/src/schema/equivalence.js";
import { identifierName } from "../../packages/core/src/schema/identifiers.js";
import type { SchemaDocument } from "../../packages/core/src/schema/types.js";

describe("core schema internals", () => {
  it("treats equivalent unknown nodes as equal even when evidence differs", () => {
    expect(
      areEquivalentSchemaNodes(
        schemaUnknownNode({
          reason: "empty-array-element",
          evidence: {
            source: "parser-json",
            detail: "first sample",
          },
        }),
        schemaUnknownNode({
          reason: "empty-array-element",
          evidence: {
            source: "parser-json",
            detail: "second sample",
          },
        }),
      ),
    ).toBe(true);
  });

  it("treats union member order as semantically irrelevant", () => {
    expect(
      areEquivalentSchemaNodes(
        schemaUnionNode([
          schemaScalarNode("string"),
          schemaScalarNode("integer"),
        ]),
        schemaUnionNode([
          schemaScalarNode("integer"),
          schemaScalarNode("string"),
        ]),
      ),
    ).toBe(true);
  });

  it("validates duplicate definitions and missing references independently", () => {
    const duplicateDefinitions: SchemaDocument = {
      version: "0.1",
      kind: "document",
      name: identifierName("DuplicateDefinitions"),
      definitions: [
        schemaDefinition("User", schemaScalarNode("string")),
        schemaDefinition("User", schemaScalarNode("integer")),
      ],
      root: schemaReferenceNode("User"),
    };

    expect(() => validateSchemaDocument(duplicateDefinitions)).toThrow(
      'Invalid schema document: duplicate definition name "User".',
    );

    const missingReference: SchemaDocument = {
      version: "0.1",
      kind: "document",
      name: identifierName("MissingReference"),
      definitions: [
        schemaDefinition(
          "User",
          schemaObjectNode([
            schemaFieldNode("id", schemaScalarNode("integer")),
          ]),
        ),
      ],
      root: schemaReferenceNode("Account"),
    };

    expect(() => validateSchemaDocument(missingReference)).toThrow(
      'Invalid schema document: reference "Account" does not match a known definition.',
    );
  });

  it("returns structured document validation diagnostics without throwing", () => {
    const missingReference: SchemaDocument = {
      version: "0.1",
      kind: "document",
      name: identifierName("MissingReference"),
      definitions: [
        schemaDefinition(
          "User",
          schemaObjectNode([
            schemaFieldNode("id", schemaScalarNode("integer")),
          ]),
        ),
      ],
      root: schemaReferenceNode("Account"),
    };

    expect(tryValidateSchemaDocument(missingReference)).toEqual({
      ok: false,
      diagnostics: [
        {
          severity: "error",
          code: "unknown-reference",
          message:
            'Invalid schema document: reference "Account" does not match a known definition.',
          path: ["root"],
          nodeKind: "reference",
          source: "core",
          evidence: {
            referenceName: "Account",
          },
        },
      ],
    });
  });

  it("validates nullable-null conflicts independently", () => {
    expect(() => validateSchemaFieldNullability(schemaNullNode())).toThrow(
      'Invalid schema field: a field whose type already includes "null" cannot also be marked nullable.',
    );
  });

  it("returns structured field-nullability diagnostics without throwing", () => {
    expect(tryValidateSchemaFieldNullability(schemaNullNode())).toEqual({
      ok: false,
      diagnostics: [
        {
          severity: "error",
          code: "invalid-field-nullability",
          message:
            'Invalid schema field: a field whose type already includes "null" cannot also be marked nullable.',
          nodeKind: "field",
          source: "core",
        },
      ],
    });
  });
});
