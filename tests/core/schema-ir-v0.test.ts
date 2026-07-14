import { describe, expect, it } from "vitest";
import {
  identifierName,
  isSchemaReferenceNode,
  isSchemaLiteralNode,
  isSchemaNullNode,
  isSchemaScalarNode,
  schemaDocument,
  schemaDefinition,
  schemaArrayNode,
  schemaFieldNode,
  schemaLiteralNode,
  schemaNullNode,
  schemaObjectNode,
  schemaReferenceNode,
  schemaRecordNode,
  schemaScalarNode,
  schemaTupleElement,
  schemaTupleNode,
  schemaUnionNode,
  schemaUnknownNode,
} from "../../packages/core/src/index.js";

describe("core schema ir v0", () => {
  it("builds a scalar root document", () => {
    expect(schemaDocument("ScalarString", schemaScalarNode("string"))).toEqual({
      version: "0.1",
      kind: "document",
      name: identifierName("ScalarString"),
      definitions: [],
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
      definitions: [],
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
      definitions: [],
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

  it("defaults unknown nodes to no-evidence semantics", () => {
    expect(schemaUnknownNode()).toEqual({
      kind: "unknown",
      reason: "no-evidence",
      nullable: false,
    });
  });

  it("normalizes unknown evidence without changing unknown semantics", () => {
    expect(
      schemaUnknownNode({
        reason: "mixed-types-collapsed",
        evidence: {
          source: "parser-json",
          detail: "  mixed scalar samples  ",
          observedKinds: [" string ", "boolean", "string", ""],
        },
      }),
    ).toEqual({
      kind: "unknown",
      reason: "mixed-types-collapsed",
      nullable: false,
      evidence: {
        source: "parser-json",
        detail: "mixed scalar samples",
        observedKinds: ["boolean", "string"],
      },
    });
  });

  it("supports explicit null type nodes", () => {
    expect(schemaDocument("StandaloneNull", schemaNullNode())).toEqual({
      version: "0.1",
      kind: "document",
      name: identifierName("StandaloneNull"),
      definitions: [],
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
      definitions: [],
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
        schemaUnionNode([
          schemaScalarNode("string"),
          schemaScalarNode("integer"),
        ]),
      ),
    ).toEqual({
      version: "0.1",
      kind: "document",
      name: identifierName("MixedValue"),
      definitions: [],
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

  it("preserves object union members with distinct literal discriminator fields", () => {
    expect(
      schemaUnionNode([
        schemaObjectNode([
          schemaFieldNode("type", schemaLiteralNode("a")),
          schemaFieldNode("value", schemaScalarNode("string")),
        ]),
        schemaObjectNode([
          schemaFieldNode("type", schemaLiteralNode("b")),
          schemaFieldNode("count", schemaScalarNode("integer")),
        ]),
      ]),
    ).toEqual({
      kind: "union",
      members: [
        {
          kind: "object",
          fields: [
            {
              kind: "field",
              name: identifierName("type"),
              required: true,
              nullable: false,
              type: {
                kind: "literal",
                value: "a",
              },
            },
            {
              kind: "field",
              name: identifierName("value"),
              required: true,
              nullable: false,
              type: {
                kind: "scalar",
                scalar: "string",
              },
            },
          ],
        },
        {
          kind: "object",
          fields: [
            {
              kind: "field",
              name: identifierName("type"),
              required: true,
              nullable: false,
              type: {
                kind: "literal",
                value: "b",
              },
            },
            {
              kind: "field",
              name: identifierName("count"),
              required: true,
              nullable: false,
              type: {
                kind: "scalar",
                scalar: "integer",
              },
            },
          ],
        },
      ],
    });
  });

  it("supports tuple type nodes", () => {
    expect(
      schemaDocument(
        "CoordinatePair",
        schemaTupleNode([
          schemaScalarNode("integer"),
          schemaScalarNode("string"),
        ]),
      ),
    ).toEqual({
      version: "0.1",
      kind: "document",
      name: identifierName("CoordinatePair"),
      definitions: [],
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
      definitions: [],
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
      definitions: [],
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

  it("supports reusable definitions and reference nodes", () => {
    expect(
      schemaDocument("UserList", schemaArrayNode(schemaReferenceNode("User")), {
        definitions: [
          schemaDefinition(
            "User",
            schemaObjectNode([
              schemaFieldNode("id", schemaScalarNode("integer")),
            ]),
          ),
        ],
      }),
    ).toEqual({
      version: "0.1",
      kind: "document",
      name: identifierName("UserList"),
      definitions: [
        {
          name: identifierName("User"),
          type: {
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
            ],
          },
        },
      ],
      root: {
        kind: "array",
        elementType: {
          kind: "reference",
          name: "User",
        },
      },
    });
  });

  it("deduplicates identical reference members inside unions", () => {
    expect(
      schemaUnionNode([
        schemaReferenceNode("User"),
        schemaReferenceNode("User"),
      ]),
    ).toEqual({
      kind: "union",
      members: [
        {
          kind: "reference",
          name: "User",
        },
      ],
    });
  });

  it("deduplicates equivalent unknown members even when evidence differs", () => {
    expect(
      schemaUnionNode([
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
      ]),
    ).toEqual({
      kind: "union",
      members: [
        {
          kind: "unknown",
          reason: "empty-array-element",
          nullable: false,
          evidence: {
            source: "parser-json",
            detail: "first sample",
          },
        },
      ],
    });
  });

  it("keeps unknown members distinct when their reasons differ", () => {
    expect(
      schemaUnionNode([
        schemaUnknownNode({
          reason: "empty-array-element",
          evidence: {
            source: "parser-json",
          },
        }),
        schemaUnknownNode({
          reason: "mixed-types-collapsed",
          evidence: {
            source: "parser-json",
            observedKinds: ["string", "boolean"],
          },
        }),
      ]),
    ).toEqual({
      kind: "union",
      members: [
        {
          kind: "unknown",
          reason: "empty-array-element",
          nullable: false,
          evidence: {
            source: "parser-json",
          },
        },
        {
          kind: "unknown",
          reason: "mixed-types-collapsed",
          nullable: false,
          evidence: {
            source: "parser-json",
            observedKinds: ["boolean", "string"],
          },
        },
      ],
    });
  });

  it("keeps unknown members distinct when nullable state differs", () => {
    expect(
      schemaUnionNode([
        schemaUnknownNode({
          reason: "no-evidence",
        }),
        schemaUnknownNode({
          reason: "no-evidence",
          nullable: true,
        }),
      ]),
    ).toEqual({
      kind: "union",
      members: [
        {
          kind: "unknown",
          reason: "no-evidence",
          nullable: false,
        },
        {
          kind: "unknown",
          reason: "no-evidence",
          nullable: true,
        },
      ],
    });
  });

  it("keeps explicit null semantics distinct from unknown semantics", () => {
    expect(schemaUnionNode([schemaNullNode(), schemaUnknownNode()])).toEqual({
      kind: "union",
      members: [
        {
          kind: "null",
        },
        {
          kind: "unknown",
          reason: "no-evidence",
          nullable: false,
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

  it("exposes schema reference guards distinctly from scalar guards", () => {
    const referenceNode = schemaReferenceNode("User");
    const scalarNode = schemaScalarNode("string");

    expect(isSchemaReferenceNode(referenceNode)).toBe(true);
    expect(isSchemaReferenceNode(scalarNode)).toBe(false);
    expect(isSchemaScalarNode(referenceNode)).toBe(false);
  });

  it("rejects duplicate definition names", () => {
    expect(() =>
      schemaDocument("DuplicateDefinitions", schemaReferenceNode("User"), {
        definitions: [
          schemaDefinition("User", schemaScalarNode("string")),
          schemaDefinition("User", schemaScalarNode("integer")),
        ],
      }),
    ).toThrow('Invalid schema document: duplicate definition name "User".');
  });

  it("rejects references to missing definitions", () => {
    expect(() =>
      schemaDocument("MissingReference", schemaReferenceNode("User")),
    ).toThrow(
      'Invalid schema document: reference "User" does not match a known definition.',
    );
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
      schemaFieldNode(
        "name",
        schemaUnionNode([schemaNullNode(), schemaScalarNode("string")]),
        {
          nullable: true,
        },
      ),
    ).toThrow(
      'Invalid schema field: a field whose type already includes "null" cannot also be marked nullable.',
    );
  });
});
