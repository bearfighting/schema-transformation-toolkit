import { describe, expect, it } from "vitest";
import { jsonSchemaParser } from "../../../packages/parsers/json-schema/src/index.js";

describe("parser-json-schema failure matrix", () => {
  it("fails explicitly for boolean false schemas", () => {
    expect(jsonSchemaParser.parse("false")).toEqual({
      ok: false,
      code: "unsupported-json-schema-boolean-false",
      message:
        "Boolean false schemas are not supported by the current shared IR.",
      diagnostics: [
        {
          severity: "error",
          code: "unsupported-json-schema-boolean-false",
          message:
            "Boolean false schemas are not supported by the current shared IR.",
          path: ["root"],
          nodeKind: "type",
          source: "parser-json-schema",
        },
      ],
    });
  });

  it("fails explicitly for mixed fixed-field and typed additionalProperties objects", () => {
    expect(
      jsonSchemaParser.parse(
        JSON.stringify({
          type: "object",
          properties: {
            id: {
              type: "string",
            },
          },
          additionalProperties: {
            type: "number",
          },
        }),
      ),
    ).toEqual({
      ok: false,
      code: "unsupported-json-schema-mixed-object-shape",
      message:
        "Mixed fixed-field objects plus typed additionalProperties are not supported by the current shared IR.",
      diagnostics: [
        {
          severity: "error",
          code: "unsupported-json-schema-mixed-object-shape",
          message:
            "Mixed fixed-field objects plus typed additionalProperties are not supported by the current shared IR.",
          path: ["root"],
          nodeKind: "object",
          source: "parser-json-schema",
        },
      ],
    });
  });

  it("fails explicitly for unsupported keywords and compact type arrays", () => {
    expect(
      jsonSchemaParser.parse(
        JSON.stringify({
          allOf: [{ type: "string" }, { type: "null" }],
        }),
      ),
    ).toEqual({
      ok: false,
      code: "unsupported-json-schema-keyword",
      message: "Unsupported JSON Schema keyword: allOf.",
      diagnostics: [
        {
          severity: "error",
          code: "unsupported-json-schema-keyword",
          message: "Unsupported JSON Schema keyword: allOf.",
          path: ["root"],
          nodeKind: "type",
          source: "parser-json-schema",
          evidence: {
            keyword: "allOf",
          },
        },
      ],
    });

    expect(
      jsonSchemaParser.parse(
        JSON.stringify({
          type: ["string", "number"],
        }),
      ),
    ).toEqual({
      ok: false,
      code: "unsupported-json-schema-type-array",
      message:
        'Compact JSON Schema "type: [...]" forms are not supported by the current parser.',
      diagnostics: [
        {
          severity: "error",
          code: "unsupported-json-schema-type-array",
          message:
            'Compact JSON Schema "type: [...]" forms are not supported by the current parser.',
          path: ["root"],
          nodeKind: "type",
          source: "parser-json-schema",
        },
      ],
    });
  });

  it("fails explicitly for unsupported refs and drafts", () => {
    expect(
      jsonSchemaParser.parse(
        JSON.stringify({
          $ref: "https://example.com/schemas/user.json",
        }),
      ),
    ).toEqual({
      ok: false,
      code: "unsupported-json-schema-ref",
      message:
        'Only document-local "$ref" values into "#/$defs/..." are supported.',
      diagnostics: [
        {
          severity: "error",
          code: "unsupported-json-schema-ref",
          message:
            'Only document-local "$ref" values into "#/$defs/..." are supported.',
          path: ["root"],
          nodeKind: "reference",
          source: "parser-json-schema",
          evidence: {
            ref: "https://example.com/schemas/user.json",
          },
        },
      ],
    });

    expect(
      jsonSchemaParser.parse(
        JSON.stringify({
          $schema: "http://json-schema.org/draft-07/schema#",
          type: "string",
        }),
      ),
    ).toEqual({
      ok: false,
      code: "unsupported-json-schema-draft",
      message:
        "Unsupported JSON Schema draft: http://json-schema.org/draft-07/schema#.",
      diagnostics: [
        {
          severity: "error",
          code: "unsupported-json-schema-draft",
          message:
            "Unsupported JSON Schema draft: http://json-schema.org/draft-07/schema#.",
          path: ["root"],
          nodeKind: "document",
          source: "parser-json-schema",
          evidence: {
            draft: "http://json-schema.org/draft-07/schema#",
          },
        },
      ],
    });
  });

  it("fails explicitly when required references unknown properties", () => {
    expect(
      jsonSchemaParser.parse(
        JSON.stringify({
          type: "object",
          properties: {
            id: {
              type: "string",
            },
          },
          required: ["id", "name"],
        }),
      ),
    ).toEqual({
      ok: false,
      code: "invalid-json-schema-shape",
      message: 'The "required" keyword references an unknown property: name.',
      diagnostics: [
        {
          severity: "error",
          code: "invalid-json-schema-shape",
          message:
            'The "required" keyword references an unknown property: name.',
          path: ["root", "name"],
          nodeKind: "object",
          source: "parser-json-schema",
        },
      ],
    });
  });

  it("fails explicitly for invalid tuple minItems boundaries", () => {
    expect(
      jsonSchemaParser.parse(
        JSON.stringify({
          type: "array",
          prefixItems: [{ type: "integer" }, { type: "string" }],
          minItems: 3,
          items: false,
        }),
      ),
    ).toEqual({
      ok: false,
      code: "invalid-json-schema-shape",
      message:
        'The "minItems" keyword must be an integer between 0 and the "prefixItems" length.',
      diagnostics: [
        {
          severity: "error",
          code: "invalid-json-schema-shape",
          message:
            'The "minItems" keyword must be an integer between 0 and the "prefixItems" length.',
          path: ["root"],
          nodeKind: "tuple",
          source: "parser-json-schema",
        },
      ],
    });

    expect(
      jsonSchemaParser.parse(
        JSON.stringify({
          type: "array",
          prefixItems: [{ type: "integer" }],
          minItems: -1,
          items: false,
        }),
      ),
    ).toEqual({
      ok: false,
      code: "invalid-json-schema-shape",
      message:
        'The "minItems" keyword must be an integer between 0 and the "prefixItems" length.',
      diagnostics: [
        {
          severity: "error",
          code: "invalid-json-schema-shape",
          message:
            'The "minItems" keyword must be an integer between 0 and the "prefixItems" length.',
          path: ["root"],
          nodeKind: "tuple",
          source: "parser-json-schema",
        },
      ],
    });

    expect(
      jsonSchemaParser.parse(
        JSON.stringify({
          type: "array",
          prefixItems: [{ type: "integer" }],
          minItems: 0.5,
          items: false,
        }),
      ),
    ).toEqual({
      ok: false,
      code: "invalid-json-schema-shape",
      message:
        'The "minItems" keyword must be an integer between 0 and the "prefixItems" length.',
      diagnostics: [
        {
          severity: "error",
          code: "invalid-json-schema-shape",
          message:
            'The "minItems" keyword must be an integer between 0 and the "prefixItems" length.',
          path: ["root"],
          nodeKind: "tuple",
          source: "parser-json-schema",
        },
      ],
    });
  });

  it("fails explicitly for invalid extracted constraint value types", () => {
    expect(
      jsonSchemaParser.parse(
        JSON.stringify({
          type: "string",
          minLength: -1,
        }),
      ),
    ).toEqual({
      ok: false,
      code: "invalid-json-schema-shape",
      message: 'The "minLength" keyword must be a non-negative integer.',
      diagnostics: [
        {
          severity: "error",
          code: "invalid-json-schema-shape",
          message: 'The "minLength" keyword must be a non-negative integer.',
          path: ["root"],
          nodeKind: "type",
          source: "parser-json-schema",
        },
      ],
    });

    expect(
      jsonSchemaParser.parse(
        JSON.stringify({
          type: "number",
          exclusiveMinimum: "0",
        }),
      ),
    ).toEqual({
      ok: false,
      code: "invalid-json-schema-shape",
      message: 'The "exclusiveMinimum" keyword must be a finite number.',
      diagnostics: [
        {
          severity: "error",
          code: "invalid-json-schema-shape",
          message: 'The "exclusiveMinimum" keyword must be a finite number.',
          path: ["root"],
          nodeKind: "type",
          source: "parser-json-schema",
        },
      ],
    });

    expect(
      jsonSchemaParser.parse(
        JSON.stringify({
          type: "array",
          items: {
            type: "string",
          },
          maxItems: -1,
        }),
      ),
    ).toEqual({
      ok: false,
      code: "invalid-json-schema-shape",
      message: 'The "maxItems" keyword must be a non-negative integer.',
      diagnostics: [
        {
          severity: "error",
          code: "invalid-json-schema-shape",
          message: 'The "maxItems" keyword must be a non-negative integer.',
          path: ["root"],
          nodeKind: "array",
          source: "parser-json-schema",
        },
      ],
    });

    expect(
      jsonSchemaParser.parse(
        JSON.stringify({
          type: "number",
          multipleOf: 0,
        }),
      ),
    ).toEqual({
      ok: false,
      code: "invalid-json-schema-shape",
      message:
        'The "multipleOf" keyword must be a finite number greater than 0.',
      diagnostics: [
        {
          severity: "error",
          code: "invalid-json-schema-shape",
          message:
            'The "multipleOf" keyword must be a finite number greater than 0.',
          path: ["root"],
          nodeKind: "type",
          source: "parser-json-schema",
        },
      ],
    });

    expect(
      jsonSchemaParser.parse(
        JSON.stringify({
          type: "array",
          items: {
            type: "string",
          },
          uniqueItems: "true",
        }),
      ),
    ).toEqual({
      ok: false,
      code: "invalid-json-schema-shape",
      message: 'The "uniqueItems" keyword must be a boolean.',
      diagnostics: [
        {
          severity: "error",
          code: "invalid-json-schema-shape",
          message: 'The "uniqueItems" keyword must be a boolean.',
          path: ["root"],
          nodeKind: "array",
          source: "parser-json-schema",
        },
      ],
    });

    expect(
      jsonSchemaParser.parse(
        JSON.stringify({
          type: "object",
          minProperties: -1,
        }),
      ),
    ).toEqual({
      ok: false,
      code: "invalid-json-schema-shape",
      message: 'The "minProperties" keyword must be a non-negative integer.',
      diagnostics: [
        {
          severity: "error",
          code: "invalid-json-schema-shape",
          message:
            'The "minProperties" keyword must be a non-negative integer.',
          path: ["root"],
          nodeKind: "object",
          source: "parser-json-schema",
        },
      ],
    });

    expect(
      jsonSchemaParser.parse(
        JSON.stringify({
          type: "object",
          maxProperties: 1.5,
        }),
      ),
    ).toEqual({
      ok: false,
      code: "invalid-json-schema-shape",
      message: 'The "maxProperties" keyword must be a non-negative integer.',
      diagnostics: [
        {
          severity: "error",
          code: "invalid-json-schema-shape",
          message:
            'The "maxProperties" keyword must be a non-negative integer.',
          path: ["root"],
          nodeKind: "object",
          source: "parser-json-schema",
        },
      ],
    });

    expect(
      jsonSchemaParser.parse(
        JSON.stringify({
          type: "string",
          format: 42,
        }),
      ),
    ).toEqual({
      ok: false,
      code: "invalid-json-schema-shape",
      message: 'The "format" keyword must be a string.',
      diagnostics: [
        {
          severity: "error",
          code: "invalid-json-schema-shape",
          message: 'The "format" keyword must be a string.',
          path: ["root"],
          nodeKind: "type",
          source: "parser-json-schema",
        },
      ],
    });

    expect(
      jsonSchemaParser.parse(
        JSON.stringify({
          type: "string",
          examples: "demo",
        }),
      ),
    ).toEqual({
      ok: false,
      code: "invalid-json-schema-shape",
      message: 'The "examples" keyword must be an array.',
      diagnostics: [
        {
          severity: "error",
          code: "invalid-json-schema-shape",
          message: 'The "examples" keyword must be an array.',
          path: ["root"],
          nodeKind: "type",
          source: "parser-json-schema",
        },
      ],
    });

    expect(
      jsonSchemaParser.parse(
        JSON.stringify({
          type: "string",
          readOnly: "true",
        }),
      ),
    ).toEqual({
      ok: false,
      code: "invalid-json-schema-shape",
      message: 'The "readOnly" keyword must be a boolean.',
      diagnostics: [
        {
          severity: "error",
          code: "invalid-json-schema-shape",
          message: 'The "readOnly" keyword must be a boolean.',
          path: ["root"],
          nodeKind: "type",
          source: "parser-json-schema",
        },
      ],
    });
  });
});
