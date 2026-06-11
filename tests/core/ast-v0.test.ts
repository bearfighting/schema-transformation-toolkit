import { describe, expect, it } from "vitest";
import {
  identifierName,
  isSchemaLiteralNode,
  isSchemaNullNode,
  isSchemaScalarNode,
  schemaDocument,
  schemaArrayNode,
  schemaFieldNode,
  schemaLiteralNode,
  schemaNullNode,
  schemaObjectNode,
  schemaRecordNode,
  schemaScalarNode,
  schemaTupleElement,
  schemaTupleNode,
  schemaUnionNode,
  schemaUnknownNode,
} from "../../packages/core/src/index.js";

describe("core ast v0", () => {
  it("builds a scalar root document", () => {
    expect(schemaDocument("ScalarString", schemaScalarNode("string"))).toEqual({
      version: "0.1",
      kind: "document",
      name: identifierName("ScalarString"),
      root: {
        kind: "scalar",
        scalar: "string",
      },
    });
  });

  it("keeps required and nullable as independent field flags", () => {
    expect(
      schemaDocument(
        "ObjectFieldOptionalAndNullable",
        schemaArrayNode(
          schemaObjectNode([
            schemaFieldNode("id", schemaScalarNode("integer")),
            schemaFieldNode("name", schemaScalarNode("string"), {
              required: false,
              nullable: true,
            }),
          ]),
        ),
      ),
    ).toEqual({
      version: "0.1",
      kind: "document",
      name: identifierName("ObjectFieldOptionalAndNullable"),
      root: {
        kind: "array",
        elementType: {
          kind: "object",
          fields: [
            {
              kind: "field",
              name: identifierName("id"),
              required: true,
              nullable: false,
              type: {
                kind: "scalar",
                scalar: "integer",
              },
            },
            {
              kind: "field",
              name: identifierName("name"),
              required: false,
              nullable: true,
              type: {
                kind: "scalar",
                scalar: "string",
              },
            },
          ],
        },
      },
    });
  });

  it("supports unknown type nodes for unresolved semantics", () => {
    expect(
      schemaDocument(
        "EmptyArray",
        schemaArrayNode(
          schemaUnknownNode({
            reason: "empty-array-element",
          }),
        ),
      ),
    ).toEqual({
      version: "0.1",
      kind: "document",
      name: identifierName("EmptyArray"),
      root: {
        kind: "array",
        elementType: {
          kind: "unknown",
          reason: "empty-array-element",
          nullable: false,
        },
      },
    });
  });

  it("supports explicit null type nodes", () => {
    expect(schemaDocument("StandaloneNull", schemaNullNode())).toEqual({
      version: "0.1",
      kind: "document",
      name: identifierName("StandaloneNull"),
      root: {
        kind: "null",
      },
    });
  });

  it("supports literal type nodes", () => {
    expect(schemaDocument("LiteralStatus", schemaLiteralNode("open"))).toEqual({
      version: "0.1",
      kind: "document",
      name: identifierName("LiteralStatus"),
      root: {
        kind: "literal",
        value: "open",
      },
    });
  });

  it("supports union type nodes", () => {
    expect(
      schemaDocument(
        "MixedValue",
        schemaUnionNode([schemaScalarNode("string"), schemaScalarNode("integer")]),
      ),
    ).toEqual({
      version: "0.1",
      kind: "document",
      name: identifierName("MixedValue"),
      root: {
        kind: "union",
        members: [
          {
            kind: "scalar",
            scalar: "string",
          },
          {
            kind: "scalar",
            scalar: "integer",
          },
        ],
      },
    });
  });

  it("supports tuple type nodes", () => {
    expect(
      schemaDocument(
        "CoordinatePair",
        schemaTupleNode([schemaScalarNode("integer"), schemaScalarNode("string")]),
      ),
    ).toEqual({
      version: "0.1",
      kind: "document",
      name: identifierName("CoordinatePair"),
      root: {
        kind: "tuple",
        elements: [
          {
            required: true,
            type: {
              kind: "scalar",
              scalar: "integer",
            },
          },
          {
            required: true,
            type: {
              kind: "scalar",
              scalar: "string",
            },
          },
        ],
      },
    });
  });

  it("supports record type nodes", () => {
    expect(
      schemaDocument(
        "Translations",
        schemaRecordNode(
          schemaScalarNode("string"),
          schemaScalarNode("string"),
        ),
      ),
    ).toEqual({
      version: "0.1",
      kind: "document",
      name: identifierName("Translations"),
      root: {
        kind: "record",
        key: {
          kind: "scalar",
          scalar: "string",
        },
        value: {
          kind: "scalar",
          scalar: "string",
        },
      },
    });
  });

  it("supports optional tuple elements distinctly from null", () => {
    expect(
      schemaDocument(
        "PartialCoordinatePair",
        schemaTupleNode([
          schemaScalarNode("integer"),
          schemaTupleElement(schemaScalarNode("string"), {
            required: false,
          }),
        ]),
      ),
    ).toEqual({
      version: "0.1",
      kind: "document",
      name: identifierName("PartialCoordinatePair"),
      root: {
        kind: "tuple",
        elements: [
          {
            required: true,
            type: {
              kind: "scalar",
              scalar: "integer",
            },
          },
          {
            required: false,
            type: {
              kind: "scalar",
              scalar: "string",
            },
          },
        ],
      },
    });
  });

  it("normalizes union members by flattening and deduplicating", () => {
    expect(
      schemaUnionNode([
        schemaScalarNode("string"),
        schemaUnionNode([
          schemaScalarNode("integer"),
          schemaScalarNode("string"),
        ]),
      ]),
    ).toEqual({
      kind: "union",
      members: [
        {
          kind: "scalar",
          scalar: "string",
        },
        {
          kind: "scalar",
          scalar: "integer",
        },
      ],
    });
  });

  it("rejects non-finite numeric literal nodes", () => {
    expect(() => schemaLiteralNode(Number.NaN)).toThrow(
      "Invalid schema literal: numeric literal values must be finite.",
    );
    expect(() => schemaLiteralNode(Number.POSITIVE_INFINITY)).toThrow(
      "Invalid schema literal: numeric literal values must be finite.",
    );
  });

  it("exposes schema null guards distinctly from scalar guards", () => {
    const nullNode = schemaNullNode();
    const scalarNode = schemaScalarNode("string");

    expect(isSchemaNullNode(nullNode)).toBe(true);
    expect(isSchemaNullNode(scalarNode)).toBe(false);
    expect(isSchemaScalarNode(nullNode)).toBe(false);
  });

  it("exposes schema literal guards distinctly from scalar guards", () => {
    const literalNode = schemaLiteralNode(true);
    const scalarNode = schemaScalarNode("boolean");

    expect(isSchemaLiteralNode(literalNode)).toBe(true);
    expect(isSchemaLiteralNode(scalarNode)).toBe(false);
    expect(isSchemaScalarNode(literalNode)).toBe(false);
  });

  it("rejects nullable flags on explicit null field types", () => {
    expect(() =>
      schemaFieldNode("name", schemaNullNode(), {
        nullable: true,
      }),
    ).toThrow(
      'Invalid schema field: a field whose type already includes "null" cannot also be marked nullable.',
    );
  });

  it("rejects nullable flags on union field types that already include null", () => {
    expect(() =>
      schemaFieldNode("name", schemaUnionNode([schemaNullNode(), schemaScalarNode("string")]), {
        nullable: true,
      }),
    ).toThrow(
      'Invalid schema field: a field whose type already includes "null" cannot also be marked nullable.',
    );
  });
});
