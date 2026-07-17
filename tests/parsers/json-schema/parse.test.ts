import { describe, expect, it } from "vitest";
import { jsonSchemaParser } from "../../../packages/parsers/json-schema/src/index.js";

describe("parser-json-schema", () => {
  it("parses object schemas with required and nullable fields", () => {
    const parsed = jsonSchemaParser.parse(
      JSON.stringify({
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "User",
        type: "object",
        properties: {
          id: {
            type: "integer",
          },
          name: {
            type: ["string", "null"],
          },
        },
        required: ["id"],
      }),
    );

    expect(parsed).toEqual({
      ok: true,
      document: {
        version: "0.1",
        kind: "document",
        name: {
          source: "User",
          words: ["user"],
        },
        definitions: [],
        root: {
          kind: "object",
          fields: [
            {
              kind: "field",
              name: {
                source: "id",
                words: ["id"],
              },
              required: true,
              nullable: false,
              type: {
                kind: "scalar",
                scalar: "integer",
              },
            },
            {
              kind: "field",
              name: {
                source: "name",
                words: ["name"],
              },
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
      diagnostics: [
        {
          severity: "warning",
          code: "json-schema-nullable-property-normalized",
          message:
            "This nullable property schema was normalized into field-level nullability in the shared IR.",
          path: ["root", "name"],
          nodeKind: "field",
          source: "parser-json-schema",
          evidence: {
            sourceKeyword: "type",
          },
        },
      ],
      semanticNotes: [
        {
          kind: "normalization",
          code: "json-schema-nullable-property-normalized",
          message:
            "This nullable property schema was normalized into field-level nullability in the shared IR.",
          path: ["root", "name"],
          nodeKind: "field",
          source: "parser-json-schema",
          layer: "shape",
          evidence: {
            sourceKeyword: "type",
          },
        },
      ],
    });
  });

  it("parses local definitions and root references", () => {
    const parsed = jsonSchemaParser.parse(
      JSON.stringify({
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "ResponseDocument",
        $defs: {
          User: {
            type: "object",
            properties: {
              id: {
                type: "number",
              },
            },
            required: ["id"],
          },
          Response: {
            type: "array",
            items: {
              $ref: "#/$defs/User",
            },
          },
        },
        $ref: "#/$defs/Response",
      }),
    );

    expect(parsed.ok).toBe(true);

    if (!parsed.ok) {
      throw new Error("Expected parser to succeed.");
    }

    expect(parsed.document.root).toEqual({
      kind: "reference",
      name: "Response",
    });
    expect(
      parsed.document.definitions.map((definition) => definition.name.source),
    ).toEqual(["User", "Response"]);
  });

  it("parses tuples and records", () => {
    const tupleParsed = jsonSchemaParser.parse(
      JSON.stringify({
        title: "Pair",
        type: "array",
        prefixItems: [{ type: "integer" }, { type: "string" }],
        minItems: 1,
        items: false,
      }),
    );

    expect(tupleParsed.ok).toBe(true);

    if (!tupleParsed.ok) {
      throw new Error("Expected tuple parser to succeed.");
    }

    expect(tupleParsed.document.root).toEqual({
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
    });
    expect(tupleParsed.constraints).toBeUndefined();

    const recordParsed = jsonSchemaParser.parse(
      JSON.stringify({
        title: "Dictionary",
        type: "object",
        additionalProperties: {
          type: "boolean",
        },
      }),
    );

    expect(recordParsed.ok).toBe(true);

    if (!recordParsed.ok) {
      throw new Error("Expected record parser to succeed.");
    }

    expect(recordParsed.document.root).toEqual({
      kind: "record",
      key: {
        kind: "scalar",
        scalar: "string",
      },
      value: {
        kind: "scalar",
        scalar: "boolean",
      },
    });
    expect(recordParsed.constraints).toBeUndefined();
  });

  it("extracts closed-object and minItems rules into constraint IR", () => {
    const parsed = jsonSchemaParser.parse(
      JSON.stringify({
        title: "ClosedUserList",
        type: "object",
        properties: {
          tags: {
            type: "array",
            items: {
              type: "string",
            },
            minItems: 1,
          },
        },
        additionalProperties: false,
      }),
    );

    expect(parsed).toEqual({
      ok: true,
      document: {
        version: "0.1",
        kind: "document",
        name: {
          source: "ClosedUserList",
          words: ["closed", "user", "list"],
        },
        definitions: [],
        root: {
          kind: "object",
          fields: [
            {
              kind: "field",
              name: {
                source: "tags",
                words: ["tags"],
              },
              required: false,
              nullable: false,
              type: {
                kind: "array",
                elementType: {
                  kind: "scalar",
                  scalar: "string",
                },
              },
            },
          ],
        },
      },
      constraints: {
        kind: "constraint-document",
        name: "ClosedUserList",
        entries: [
          {
            target: {
              kind: "node",
              path: ["root", "tags"],
            },
            constraints: [
              {
                kind: "min-items",
                value: 1,
                message:
                  'This JSON Schema "minItems" constraint was preserved in constraint IR.',
                evidence: {
                  sourceKeyword: "minItems",
                },
              },
            ],
          },
          {
            target: {
              kind: "node",
              path: ["root"],
            },
            constraints: [
              {
                kind: "closed-object",
                value: false,
                message:
                  'This JSON Schema "additionalProperties: false" rule was preserved in constraint IR.',
                evidence: {
                  sourceKeyword: "additionalProperties",
                },
              },
            ],
          },
        ],
      },
      semanticNotes: [
        {
          kind: "normalization",
          code: "json-schema-min-items-extracted",
          message:
            'This JSON Schema "minItems" rule was extracted into constraint IR.',
          path: ["root", "tags"],
          nodeKind: "array",
          source: "parser-json-schema",
          layer: "constraint",
          evidence: {
            sourceKeyword: "minItems",
            value: 1,
          },
        },
        {
          kind: "normalization",
          code: "json-schema-closed-object-extracted",
          message:
            'This JSON Schema "additionalProperties: false" rule was extracted into constraint IR.',
          path: ["root"],
          nodeKind: "object",
          source: "parser-json-schema",
          layer: "constraint",
          evidence: {
            sourceKeyword: "additionalProperties",
            value: false,
          },
        },
      ],
    });
  });

  it("extracts pattern, numeric bounds, maxItems, and description into constraint IR", () => {
    const parsed = jsonSchemaParser.parse(
      JSON.stringify({
        title: "ConstrainedUser",
        type: "object",
        format: "json-pointer",
        default: {
          code: "AA",
        },
        examples: [{ code: "BB" }],
        description: "User constraints",
        minProperties: 1,
        maxProperties: 8,
        properties: {
          code: {
            type: "string",
            format: "uuid",
            default: "ABCD",
            examples: ["EFGH"],
            readOnly: true,
            pattern: "^[A-Z]+$",
            minLength: 2,
            maxLength: 8,
            description: "Uppercase code",
          },
          age: {
            type: "integer",
            minimum: 0,
            exclusiveMinimum: -1,
          },
          score: {
            type: "number",
            maximum: 100,
            exclusiveMaximum: 101,
            multipleOf: 0.5,
            writeOnly: true,
          },
          tags: {
            type: "array",
            items: {
              type: "string",
            },
            minItems: 1,
            maxItems: 3,
            uniqueItems: true,
            description: "User tags",
          },
        },
      }),
    );

    expect(parsed.ok).toBe(true);

    if (!parsed.ok) {
      throw new Error("Expected parser to succeed.");
    }

    expect(parsed.constraints?.kind).toBe("constraint-document");
    expect(parsed.constraints?.name).toBe("ConstrainedUser");
    expect(parsed.constraints?.entries).toHaveLength(24);
    expect(parsed.constraints?.entries).toEqual(
      expect.arrayContaining([
        {
          target: {
            kind: "node",
            path: ["root", "code"],
          },
          constraints: [
            {
              kind: "format",
              value: "uuid",
              message:
                'This JSON Schema "format" annotation was preserved in constraint IR.',
              evidence: {
                sourceKeyword: "format",
              },
            },
          ],
        },
        {
          target: {
            kind: "node",
            path: ["root", "code"],
          },
          constraints: [
            {
              kind: "default",
              value: "ABCD",
              message:
                'This JSON Schema "default" annotation was preserved in constraint IR.',
              evidence: {
                sourceKeyword: "default",
              },
            },
          ],
        },
        {
          target: {
            kind: "node",
            path: ["root", "code"],
          },
          constraints: [
            {
              kind: "examples",
              value: ["EFGH"],
              message:
                'This JSON Schema "examples" annotation was preserved in constraint IR.',
              evidence: {
                sourceKeyword: "examples",
              },
            },
          ],
        },
        {
          target: {
            kind: "node",
            path: ["root", "code"],
          },
          constraints: [
            {
              kind: "read-only",
              value: true,
              message:
                'This JSON Schema "readOnly" annotation was preserved in constraint IR.',
              evidence: {
                sourceKeyword: "readOnly",
              },
            },
          ],
        },
        {
          target: {
            kind: "node",
            path: ["root", "code"],
          },
          constraints: [
            {
              kind: "pattern",
              value: "^[A-Z]+$",
              message:
                'This JSON Schema "pattern" rule was preserved in constraint IR.',
              evidence: {
                sourceKeyword: "pattern",
              },
            },
          ],
        },
        {
          target: {
            kind: "node",
            path: ["root", "code"],
          },
          constraints: [
            {
              kind: "min-length",
              value: 2,
              message:
                'This JSON Schema "minLength" rule was preserved in constraint IR.',
              evidence: {
                sourceKeyword: "minLength",
              },
            },
          ],
        },
        {
          target: {
            kind: "node",
            path: ["root", "code"],
          },
          constraints: [
            {
              kind: "max-length",
              value: 8,
              message:
                'This JSON Schema "maxLength" rule was preserved in constraint IR.',
              evidence: {
                sourceKeyword: "maxLength",
              },
            },
          ],
        },
        {
          target: {
            kind: "node",
            path: ["root", "code"],
          },
          constraints: [
            {
              kind: "description",
              value: "Uppercase code",
              message:
                'This JSON Schema "description" annotation was preserved in constraint IR.',
              evidence: {
                sourceKeyword: "description",
              },
            },
          ],
        },
        {
          target: {
            kind: "node",
            path: ["root", "age"],
          },
          constraints: [
            {
              kind: "minimum",
              value: 0,
              message:
                'This JSON Schema "minimum" rule was preserved in constraint IR.',
              evidence: {
                sourceKeyword: "minimum",
              },
            },
          ],
        },
        {
          target: {
            kind: "node",
            path: ["root", "age"],
          },
          constraints: [
            {
              kind: "exclusive-minimum",
              value: -1,
              message:
                'This JSON Schema "exclusiveMinimum" rule was preserved in constraint IR.',
              evidence: {
                sourceKeyword: "exclusiveMinimum",
              },
            },
          ],
        },
        {
          target: {
            kind: "node",
            path: ["root", "score"],
          },
          constraints: [
            {
              kind: "maximum",
              value: 100,
              message:
                'This JSON Schema "maximum" rule was preserved in constraint IR.',
              evidence: {
                sourceKeyword: "maximum",
              },
            },
          ],
        },
        {
          target: {
            kind: "node",
            path: ["root", "score"],
          },
          constraints: [
            {
              kind: "exclusive-maximum",
              value: 101,
              message:
                'This JSON Schema "exclusiveMaximum" rule was preserved in constraint IR.',
              evidence: {
                sourceKeyword: "exclusiveMaximum",
              },
            },
          ],
        },
        {
          target: {
            kind: "node",
            path: ["root", "score"],
          },
          constraints: [
            {
              kind: "multiple-of",
              value: 0.5,
              message:
                'This JSON Schema "multipleOf" rule was preserved in constraint IR.',
              evidence: {
                sourceKeyword: "multipleOf",
              },
            },
          ],
        },
        {
          target: {
            kind: "node",
            path: ["root", "score"],
          },
          constraints: [
            {
              kind: "write-only",
              value: true,
              message:
                'This JSON Schema "writeOnly" annotation was preserved in constraint IR.',
              evidence: {
                sourceKeyword: "writeOnly",
              },
            },
          ],
        },
        {
          target: {
            kind: "node",
            path: ["root", "tags"],
          },
          constraints: [
            {
              kind: "min-items",
              value: 1,
              message:
                'This JSON Schema "minItems" constraint was preserved in constraint IR.',
              evidence: {
                sourceKeyword: "minItems",
              },
            },
          ],
        },
        {
          target: {
            kind: "node",
            path: ["root", "tags"],
          },
          constraints: [
            {
              kind: "max-items",
              value: 3,
              message:
                'This JSON Schema "maxItems" rule was preserved in constraint IR.',
              evidence: {
                sourceKeyword: "maxItems",
              },
            },
          ],
        },
        {
          target: {
            kind: "node",
            path: ["root", "tags"],
          },
          constraints: [
            {
              kind: "unique-items",
              value: true,
              message:
                'This JSON Schema "uniqueItems" rule was preserved in constraint IR.',
              evidence: {
                sourceKeyword: "uniqueItems",
              },
            },
          ],
        },
        {
          target: {
            kind: "node",
            path: ["root", "tags"],
          },
          constraints: [
            {
              kind: "description",
              value: "User tags",
              message:
                'This JSON Schema "description" annotation was preserved in constraint IR.',
              evidence: {
                sourceKeyword: "description",
              },
            },
          ],
        },
        {
          target: {
            kind: "node",
            path: ["root"],
          },
          constraints: [
            {
              kind: "format",
              value: "json-pointer",
              message:
                'This JSON Schema "format" annotation was preserved in constraint IR.',
              evidence: {
                sourceKeyword: "format",
              },
            },
          ],
        },
        {
          target: {
            kind: "node",
            path: ["root"],
          },
          constraints: [
            {
              kind: "default",
              value: {
                code: "AA",
              },
              message:
                'This JSON Schema "default" annotation was preserved in constraint IR.',
              evidence: {
                sourceKeyword: "default",
              },
            },
          ],
        },
        {
          target: {
            kind: "node",
            path: ["root"],
          },
          constraints: [
            {
              kind: "examples",
              value: [{ code: "BB" }],
              message:
                'This JSON Schema "examples" annotation was preserved in constraint IR.',
              evidence: {
                sourceKeyword: "examples",
              },
            },
          ],
        },
        {
          target: {
            kind: "node",
            path: ["root"],
          },
          constraints: [
            {
              kind: "min-properties",
              value: 1,
              message:
                'This JSON Schema "minProperties" rule was preserved in constraint IR.',
              evidence: {
                sourceKeyword: "minProperties",
              },
            },
          ],
        },
        {
          target: {
            kind: "node",
            path: ["root"],
          },
          constraints: [
            {
              kind: "max-properties",
              value: 8,
              message:
                'This JSON Schema "maxProperties" rule was preserved in constraint IR.',
              evidence: {
                sourceKeyword: "maxProperties",
              },
            },
          ],
        },
        {
          target: {
            kind: "node",
            path: ["root"],
          },
          constraints: [
            {
              kind: "description",
              value: "User constraints",
              message:
                'This JSON Schema "description" annotation was preserved in constraint IR.',
              evidence: {
                sourceKeyword: "description",
              },
            },
          ],
        },
      ]),
    );
  });

  it("treats additionalProperties: true as open-object-compatible or record-unknown semantics", () => {
    const openObjectParsed = jsonSchemaParser.parse(
      JSON.stringify({
        title: "OpenUser",
        type: "object",
        properties: {
          id: {
            type: "string",
          },
        },
        additionalProperties: true,
      }),
    );

    expect(openObjectParsed.ok).toBe(true);

    if (!openObjectParsed.ok) {
      throw new Error("Expected open object parser to succeed.");
    }

    expect(openObjectParsed.document.root).toEqual({
      kind: "object",
      fields: [
        {
          kind: "field",
          name: {
            source: "id",
            words: ["id"],
          },
          required: false,
          nullable: false,
          type: {
            kind: "scalar",
            scalar: "string",
          },
        },
      ],
    });

    const wideRecordParsed = jsonSchemaParser.parse(
      JSON.stringify({
        title: "OpenDictionary",
        type: "object",
        additionalProperties: true,
      }),
    );

    expect(wideRecordParsed.ok).toBe(true);

    if (!wideRecordParsed.ok) {
      throw new Error("Expected wide record parser to succeed.");
    }

    expect(wideRecordParsed.document.root).toEqual({
      kind: "record",
      key: {
        kind: "scalar",
        scalar: "string",
      },
      value: {
        kind: "unknown",
        reason: "no-evidence",
        nullable: false,
        evidence: {
          source: "parser-json",
          detail:
            'A JSON Schema "additionalProperties: true" map was lowered to Record<string, unknown>.',
        },
      },
    });
  });

  it("lowers anyOf and true schemas with diagnostics", () => {
    const parsed = jsonSchemaParser.parse(
      JSON.stringify({
        title: "WideValues",
        anyOf: [{ const: "open" }, true],
      }),
    );

    expect(parsed).toEqual({
      ok: true,
      document: {
        version: "0.1",
        kind: "document",
        name: {
          source: "WideValues",
          words: ["wide", "values"],
        },
        definitions: [],
        root: {
          kind: "union",
          members: [
            {
              kind: "literal",
              value: "open",
            },
            {
              kind: "unknown",
              reason: "no-evidence",
              nullable: false,
              evidence: {
                source: "parser-json",
                detail: "JSON Schema boolean true was lowered to unknown.",
              },
            },
          ],
        },
      },
      diagnostics: [
        {
          severity: "warning",
          code: "json-schema-union-composition-lowered",
          message:
            'The JSON Schema "anyOf" composition was lowered into the shared union semantics.',
          path: ["root"],
          nodeKind: "union",
          source: "parser-json-schema",
          evidence: {
            sourceKeyword: "anyOf",
          },
        },
        {
          severity: "warning",
          code: "json-schema-true-schema-lowered",
          message:
            "This JSON Schema true-schema was lowered into the shared unknown schema semantics.",
          path: ["root", "1"],
          nodeKind: "unknown",
          source: "parser-json-schema",
          evidence: {
            sourceKeyword: true,
          },
        },
      ],
      semanticNotes: [
        {
          kind: "loss",
          code: "json-schema-union-composition-lowered",
          message:
            'The JSON Schema "anyOf" composition was lowered into the shared union semantics.',
          path: ["root"],
          nodeKind: "union",
          source: "parser-json-schema",
          layer: "shape",
          evidence: {
            sourceKeyword: "anyOf",
          },
        },
        {
          kind: "widening",
          code: "json-schema-true-schema-lowered",
          message:
            "This JSON Schema true-schema was lowered into the shared unknown schema semantics.",
          path: ["root", "1"],
          nodeKind: "unknown",
          source: "parser-json-schema",
          layer: "shape",
          evidence: {
            sourceKeyword: true,
          },
        },
      ],
    });
  });

  it("lowers nested true schemas inside arrays and object properties", () => {
    const parsed = jsonSchemaParser.parse(
      JSON.stringify({
        title: "PartialShape",
        type: "object",
        properties: {
          tags: {
            type: "array",
            items: true,
          },
          metadata: true,
        },
        required: ["tags", "metadata"],
      }),
    );

    expect(parsed).toEqual({
      ok: true,
      document: {
        version: "0.1",
        kind: "document",
        name: {
          source: "PartialShape",
          words: ["partial", "shape"],
        },
        definitions: [],
        root: {
          kind: "object",
          fields: [
            {
              kind: "field",
              name: {
                source: "tags",
                words: ["tags"],
              },
              required: true,
              nullable: false,
              type: {
                kind: "array",
                elementType: {
                  kind: "unknown",
                  reason: "no-evidence",
                  nullable: false,
                  evidence: {
                    source: "parser-json",
                    detail: "JSON Schema boolean true was lowered to unknown.",
                  },
                },
              },
            },
            {
              kind: "field",
              name: {
                source: "metadata",
                words: ["metadata"],
              },
              required: true,
              nullable: false,
              type: {
                kind: "unknown",
                reason: "no-evidence",
                nullable: false,
                evidence: {
                  source: "parser-json",
                  detail: "JSON Schema boolean true was lowered to unknown.",
                },
              },
            },
          ],
        },
      },
      diagnostics: [
        {
          severity: "warning",
          code: "json-schema-true-schema-lowered",
          message:
            "This JSON Schema true-schema was lowered into the shared unknown schema semantics.",
          path: ["root", "tags", "elementType"],
          nodeKind: "unknown",
          source: "parser-json-schema",
          evidence: {
            sourceKeyword: true,
          },
        },
        {
          severity: "warning",
          code: "json-schema-true-schema-lowered",
          message:
            "This JSON Schema true-schema was lowered into the shared unknown schema semantics.",
          path: ["root", "metadata"],
          nodeKind: "unknown",
          source: "parser-json-schema",
          evidence: {
            sourceKeyword: true,
          },
        },
      ],
      semanticNotes: [
        {
          kind: "widening",
          code: "json-schema-true-schema-lowered",
          message:
            "This JSON Schema true-schema was lowered into the shared unknown schema semantics.",
          path: ["root", "tags", "elementType"],
          nodeKind: "unknown",
          source: "parser-json-schema",
          layer: "shape",
          evidence: {
            sourceKeyword: true,
          },
        },
        {
          kind: "widening",
          code: "json-schema-true-schema-lowered",
          message:
            "This JSON Schema true-schema was lowered into the shared unknown schema semantics.",
          path: ["root", "metadata"],
          nodeKind: "unknown",
          source: "parser-json-schema",
          layer: "shape",
          evidence: {
            sourceKeyword: true,
          },
        },
      ],
    });
  });

  it("treats metadata-only roots and explicit true roots as the same wide schema meaning", () => {
    const metadataOnlyParsed = jsonSchemaParser.parse(
      JSON.stringify({
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "UnknownValue",
      }),
    );
    const explicitTrueParsed = jsonSchemaParser.parse("true", {
      name: "UnknownValue",
    });

    expect(metadataOnlyParsed.ok).toBe(true);
    expect(explicitTrueParsed.ok).toBe(true);

    if (!metadataOnlyParsed.ok || !explicitTrueParsed.ok) {
      throw new Error("Expected both wide-schema parses to succeed.");
    }

    expect(metadataOnlyParsed.document.root).toEqual({
      kind: "unknown",
      reason: "no-evidence",
      nullable: false,
      evidence: {
        source: "parser-json",
        detail: "Metadata-only root schema was lowered to unknown.",
      },
    });
    expect(explicitTrueParsed.document.root).toEqual({
      kind: "unknown",
      reason: "no-evidence",
      nullable: false,
      evidence: {
        source: "parser-json",
        detail: "JSON Schema boolean true was lowered to unknown.",
      },
    });
    expect(metadataOnlyParsed.semanticNotes).toEqual([
      {
        kind: "widening",
        code: "json-schema-metadata-only-root-lowered",
        message:
          "This metadata-only root schema was lowered into the shared unknown schema semantics.",
        path: ["root"],
        nodeKind: "unknown",
        source: "parser-json-schema",
        layer: "shape",
        evidence: {
          sourceForm: "metadata-only-root",
        },
      },
    ]);
    expect(explicitTrueParsed.semanticNotes).toEqual([
      {
        kind: "widening",
        code: "json-schema-true-schema-lowered",
        message:
          "This JSON Schema true-schema was lowered into the shared unknown schema semantics.",
        path: ["root"],
        nodeKind: "unknown",
        source: "parser-json-schema",
        layer: "shape",
        evidence: {
          sourceKeyword: true,
        },
      },
    ]);
  });
});
