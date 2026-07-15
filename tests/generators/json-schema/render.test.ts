import { describe, expect, it } from "vitest";
import {
  type SchemaDocument,
  schemaArrayNode,
  schemaDefinition,
  schemaDocument,
  schemaFieldNode,
  schemaLiteralNode,
  schemaNullNode,
  schemaObjectNode,
  schemaReferenceNode,
  schemaRecordNode,
  schemaScalarNode,
  schemaTupleNode,
  schemaUnionNode,
  schemaUnknownNode,
} from "../../../packages/core/src/index.js";
import {
  DEFAULT_JSON_SCHEMA_GENERATOR_OPTIONS,
  configureJsonSchemaGenerator,
  createJsonSchemaGenerator,
  generateJsonSchema,
  jsonSchemaGenerator,
  prepareJsonSchemaGeneratorOptions,
  preparedJsonSchemaGeneratorOptions,
  resolveJsonSchemaGeneratorOptions,
  tryGenerateJsonSchema,
} from "../../../packages/generators/json-schema/src/index.js";

describe("generator-json-schema", () => {
  it("generates object documents with required and nullable fields", () => {
    const doc = schemaDocument(
      "User",
      schemaObjectNode([
        schemaFieldNode("id", schemaScalarNode("integer")),
        schemaFieldNode("name", schemaScalarNode("string"), {
          required: false,
          nullable: true,
        }),
      ]),
    );

    expect(generateJsonSchema(doc)).toEqual({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "User",
      type: "object",
      properties: {
        id: {
          type: "integer",
        },
        name: {
          oneOf: [{ type: "string" }, { type: "null" }],
        },
      },
      required: ["id"],
    });
  });

  it('supports objectAdditionalPropertiesMode: "false" for ordinary objects', () => {
    const doc = schemaDocument(
      "User",
      schemaObjectNode([schemaFieldNode("id", schemaScalarNode("integer"))]),
    );

    expect(
      generateJsonSchema(doc, {
        objectAdditionalPropertiesMode: "false",
      }),
    ).toEqual({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "User",
      type: "object",
      properties: {
        id: {
          type: "integer",
        },
      },
      additionalProperties: false,
      required: ["id"],
    });

    expect(
      tryGenerateJsonSchema(doc, {
        objectAdditionalPropertiesMode: "false",
      }),
    ).toEqual({
      ok: true,
      output: {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "User",
        type: "object",
        properties: {
          id: {
            type: "integer",
          },
        },
        additionalProperties: false,
        required: ["id"],
      },
      diagnostics: [
        {
          severity: "warning",
          code: "closed-object-schema",
          message:
            "This object schema is rendering with additionalProperties: false, which may reject extra properties beyond the shared IR field set.",
          path: ["root"],
          nodeKind: "object",
          source: "generator-json-schema",
          evidence: {
            objectAdditionalPropertiesMode: "false",
            fieldNames: ["id"],
          },
        },
      ],
    });
  });

  it("generates arrays, records, unions, tuples, and literals", () => {
    expect(
      generateJsonSchema(
        schemaDocument("Tags", schemaArrayNode(schemaScalarNode("string"))),
      ),
    ).toEqual({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "Tags",
      type: "array",
      items: {
        type: "string",
      },
    });

    expect(
      generateJsonSchema(
        schemaDocument(
          "Status",
          schemaUnionNode([schemaLiteralNode("open"), schemaLiteralNode(true)]),
        ),
      ),
    ).toEqual({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "Status",
      oneOf: [{ const: "open" }, { const: true }],
    });

    expect(
      generateJsonSchema(
        schemaDocument(
          "Coordinates",
          schemaTupleNode([
            { required: true, type: schemaScalarNode("number") },
            { required: false, type: schemaScalarNode("string") },
          ]),
        ),
      ),
    ).toEqual({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "Coordinates",
      type: "array",
      prefixItems: [{ type: "number" }, { type: "string" }],
      minItems: 1,
      items: false,
    });

    expect(
      generateJsonSchema(
        schemaDocument(
          "Dictionary",
          schemaRecordNode(
            schemaScalarNode("string"),
            schemaScalarNode("boolean"),
          ),
        ),
      ),
    ).toEqual({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "Dictionary",
      type: "object",
      additionalProperties: {
        type: "boolean",
      },
    });
  });

  it('supports unionComposition: "anyOf"', () => {
    const doc = schemaDocument(
      "Status",
      schemaUnionNode([schemaLiteralNode("open"), schemaLiteralNode(true)]),
    );

    expect(
      generateJsonSchema(doc, {
        unionComposition: "anyOf",
      }),
    ).toEqual({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "Status",
      anyOf: [{ const: "open" }, { const: true }],
    });

    expect(
      tryGenerateJsonSchema(doc, {
        unionComposition: "anyOf",
      }),
    ).toEqual({
      ok: true,
      output: {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "Status",
        anyOf: [{ const: "open" }, { const: true }],
      },
    });
  });

  it("locks the structural difference between oneOf and anyOf for overlapping unions", () => {
    const doc = schemaDocument(
      "MaybeString",
      schemaUnionNode([schemaScalarNode("string"), schemaLiteralNode("open")]),
    );

    expect(generateJsonSchema(doc)).toEqual({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "MaybeString",
      oneOf: [{ type: "string" }, { const: "open" }],
    });

    expect(
      generateJsonSchema(doc, {
        unionComposition: "anyOf",
      }),
    ).toEqual({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "MaybeString",
      anyOf: [{ type: "string" }, { const: "open" }],
    });

    expect(tryGenerateJsonSchema(doc)).toEqual({
      ok: true,
      output: {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "MaybeString",
        oneOf: [{ type: "string" }, { const: "open" }],
      },
      diagnostics: [
        {
          severity: "warning",
          code: "overlapping-oneof-members",
          message:
            "This union is rendering with oneOf, but some member branches may overlap under JSON Schema semantics.",
          path: ["root"],
          nodeKind: "union",
          source: "generator-json-schema",
          evidence: {
            unionComposition: "oneOf",
            overlappingPairs: [{ left: 0, right: 1 }],
            memberKinds: [
              {
                left: 0,
                right: 1,
                leftKind: "scalar",
                rightKind: "literal",
              },
            ],
          },
        },
      ],
    });

    expect(
      tryGenerateJsonSchema(doc, {
        unionComposition: "anyOf",
      }),
    ).toEqual({
      ok: true,
      output: {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "MaybeString",
        anyOf: [{ type: "string" }, { const: "open" }],
      },
      diagnostics: [
        {
          severity: "warning",
          code: "overlapping-anyof-members",
          message:
            "This union is rendering with anyOf, so overlapping member branches may be accepted without exclusivity under JSON Schema semantics.",
          path: ["root"],
          nodeKind: "union",
          source: "generator-json-schema",
          evidence: {
            unionComposition: "anyOf",
            overlappingPairs: [{ left: 0, right: 1 }],
            memberKinds: [
              {
                left: 0,
                right: 1,
                leftKind: "scalar",
                rightKind: "literal",
              },
            ],
          },
        },
      ],
    });
  });

  it("renders reusable definitions and references through $defs", () => {
    const doc = schemaDocument(
      "UserDirectory",
      schemaArrayNode(schemaReferenceNode("User")),
      {
        definitions: [
          schemaDefinition(
            "User",
            schemaObjectNode([
              schemaFieldNode("id", schemaScalarNode("integer")),
            ]),
          ),
        ],
      },
    );

    expect(generateJsonSchema(doc)).toEqual({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "UserDirectory",
      $defs: {
        User: {
          type: "object",
          properties: {
            id: {
              type: "integer",
            },
          },
          required: ["id"],
        },
      },
      type: "array",
      items: {
        $ref: "#/$defs/User",
      },
    });
  });

  it("renders unknown roots as the widest schema with document metadata", () => {
    const doc = schemaDocument(
      "UnknownValue",
      schemaUnknownNode({
        reason: "no-evidence",
        nullable: false,
      }),
    );

    expect(generateJsonSchema(doc)).toEqual({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "UnknownValue",
    });

    expect(tryGenerateJsonSchema(doc)).toEqual({
      ok: true,
      output: {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "UnknownValue",
      },
      diagnostics: [
        {
          severity: "warning",
          code: "wide-unknown-schema",
          message:
            "This schema node renders as the widest JSON Schema and may accept values more broadly than the source evidence suggests.",
          path: ["root"],
          nodeKind: "unknown",
          source: "generator-json-schema",
          evidence: {
            reason: "no-evidence",
            nullable: false,
            renderedForm: "metadata-only-root",
          },
        },
      ],
    });
  });

  it("keeps metadata-only unknown roots stable even when reusable definitions exist", () => {
    const doc = schemaDocument(
      "UnknownValue",
      schemaUnknownNode({
        reason: "no-evidence",
      }),
      {
        definitions: [schemaDefinition("Status", schemaLiteralNode("open"))],
      },
    );

    expect(generateJsonSchema(doc)).toEqual({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "UnknownValue",
      $defs: {
        Status: {
          const: "open",
        },
      },
    });

    expect(tryGenerateJsonSchema(doc)).toEqual({
      ok: true,
      output: {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "UnknownValue",
        $defs: {
          Status: {
            const: "open",
          },
        },
      },
      diagnostics: [
        {
          severity: "warning",
          code: "wide-unknown-schema",
          message:
            "This schema node renders as the widest JSON Schema and may accept values more broadly than the source evidence suggests.",
          path: ["root"],
          nodeKind: "unknown",
          source: "generator-json-schema",
          evidence: {
            reason: "no-evidence",
            nullable: false,
            renderedForm: "metadata-only-root",
          },
        },
      ],
    });
  });

  it("supports generator instances and runtime options", () => {
    const generator = createJsonSchemaGenerator({
      includeSchemaUri: false,
    });
    const doc = schemaDocument("User", schemaScalarNode("string"));

    expect(generator.target).toBe("json-schema");
    expect(generator.generate(doc)).toEqual({
      ok: true,
      output: {
        title: "User",
        type: "string",
      },
    });

    expect(generator.generate(doc, { includeId: true })).toEqual({
      ok: true,
      output: {
        $id: "User",
        title: "User",
        type: "string",
      },
    });
  });

  it("omits $schema when includeSchemaUri is false and keeps $defs when needed", () => {
    const doc = schemaDocument(
      "UserDirectory",
      schemaArrayNode(schemaReferenceNode("User")),
      {
        definitions: [
          schemaDefinition(
            "User",
            schemaObjectNode([
              schemaFieldNode("id", schemaScalarNode("integer")),
            ]),
          ),
        ],
      },
    );

    expect(
      generateJsonSchema(doc, {
        includeSchemaUri: false,
      }),
    ).toEqual({
      title: "UserDirectory",
      $defs: {
        User: {
          type: "object",
          properties: {
            id: {
              type: "integer",
            },
          },
          required: ["id"],
        },
      },
      type: "array",
      items: {
        $ref: "#/$defs/User",
      },
    });
  });

  it("renders unknown array element types as true item schemas", () => {
    const doc = schemaDocument(
      "PartialShape",
      schemaObjectNode([
        schemaFieldNode(
          "tags",
          schemaArrayNode(
            schemaUnknownNode({
              reason: "empty-array-element",
              evidence: {
                source: "parser-json",
                detail: "empty sample",
              },
            }),
          ),
        ),
      ]),
    );

    expect(generateJsonSchema(doc)).toEqual({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "PartialShape",
      type: "object",
      properties: {
        tags: {
          type: "array",
          items: true,
        },
      },
      required: ["tags"],
    });
  });

  it("renders tuple positions with mixed optional and nullable semantics distinctly", () => {
    const doc = schemaDocument(
      "TupleShape",
      schemaObjectNode([
        schemaFieldNode(
          "pair",
          schemaTupleNode([
            { required: true, type: schemaScalarNode("number") },
            { required: false, type: schemaScalarNode("string") },
            { required: true, type: schemaNullNode() },
          ]),
        ),
      ]),
    );

    expect(generateJsonSchema(doc)).toEqual({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "TupleShape",
      type: "object",
      properties: {
        pair: {
          type: "array",
          prefixItems: [
            { type: "number" },
            { type: "string" },
            { type: "null" },
          ],
          minItems: 2,
          items: false,
        },
      },
      required: ["pair"],
    });
  });

  it("renders root references with reusable definitions as a top-level $ref document", () => {
    const doc = schemaDocument("UserDocument", schemaReferenceNode("User"), {
      definitions: [
        schemaDefinition(
          "User",
          schemaObjectNode([
            schemaFieldNode("id", schemaScalarNode("integer")),
          ]),
        ),
      ],
    });

    expect(generateJsonSchema(doc)).toEqual({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "UserDocument",
      $defs: {
        User: {
          type: "object",
          properties: {
            id: {
              type: "integer",
            },
          },
          required: ["id"],
        },
      },
      $ref: "#/$defs/User",
    });
  });

  it("returns structured failures for unresolved references", () => {
    const doc: SchemaDocument = {
      version: "0.1",
      kind: "document",
      name: {
        source: "Broken",
        words: ["Broken"],
      },
      definitions: [],
      root: schemaReferenceNode("Missing"),
    };

    expect(tryGenerateJsonSchema(doc)).toEqual({
      ok: false,
      code: "invalid-json-schema-reference",
      message:
        'The schema reference "Missing" does not match a renderable definition.',
      diagnostics: [
        {
          severity: "error",
          code: "invalid-json-schema-reference",
          message:
            'The schema reference "Missing" does not match a renderable definition.',
          path: ["root"],
          nodeKind: "reference",
          source: "generator-json-schema",
          evidence: {
            referenceName: "Missing",
          },
        },
      ],
    });
  });

  it("returns structured failures for non-string record keys on runtime documents", () => {
    const doc: SchemaDocument = {
      version: "0.1",
      kind: "document",
      name: {
        source: "BrokenRecord",
        words: ["Broken", "Record"],
      },
      definitions: [],
      root: {
        kind: "record",
        key: schemaScalarNode("integer"),
        value: schemaScalarNode("string"),
      },
    };

    expect(tryGenerateJsonSchema(doc)).toEqual({
      ok: false,
      code: "invalid-record-key",
      message: "JSON Schema record keys must render from string scalar keys.",
      diagnostics: [
        {
          severity: "error",
          code: "invalid-record-key",
          message:
            "JSON Schema record keys must render from string scalar keys.",
          path: ["root", "key"],
          nodeKind: "record",
          source: "generator-json-schema",
        },
      ],
    });
  });

  it("exposes default and resolved options", () => {
    expect(DEFAULT_JSON_SCHEMA_GENERATOR_OPTIONS).toEqual({
      draft: "2020-12",
      includeSchemaUri: true,
      includeId: false,
      unknownStrategy: "true",
      objectAdditionalPropertiesMode: "omit",
      unionComposition: "oneOf",
    });

    expect(resolveJsonSchemaGeneratorOptions({ includeId: true })).toEqual({
      draft: "2020-12",
      includeSchemaUri: true,
      includeId: true,
      unknownStrategy: "true",
      objectAdditionalPropertiesMode: "omit",
      unionComposition: "oneOf",
    });

    expect(prepareJsonSchemaGeneratorOptions()).toEqual({
      resolved: DEFAULT_JSON_SCHEMA_GENERATOR_OPTIONS,
      warnings: [],
      errors: [],
    });
  });

  it("exposes configured generator instances with prepared options", () => {
    const configured = configureJsonSchemaGenerator({
      includeSchemaUri: false,
      includeId: true,
    });

    expect(configured.prepared).toEqual({
      resolved: {
        draft: "2020-12",
        includeSchemaUri: false,
        includeId: true,
        unknownStrategy: "true",
        objectAdditionalPropertiesMode: "omit",
        unionComposition: "oneOf",
      },
      warnings: [],
      errors: [],
    });

    expect(preparedJsonSchemaGeneratorOptions).toEqual({
      resolved: DEFAULT_JSON_SCHEMA_GENERATOR_OPTIONS,
      warnings: [],
      errors: [],
    });

    expect(jsonSchemaGenerator.target).toBe("json-schema");
  });
});
