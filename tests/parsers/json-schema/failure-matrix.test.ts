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

  it("fails explicitly for closed objects", () => {
    expect(
      jsonSchemaParser.parse(
        JSON.stringify({
          type: "object",
          properties: {
            id: {
              type: "string",
            },
          },
          additionalProperties: false,
        }),
      ),
    ).toEqual({
      ok: false,
      code: "unsupported-json-schema-closed-object",
      message:
        'Closed objects through "additionalProperties: false" are not supported by the current shared IR.',
      diagnostics: [
        {
          severity: "error",
          code: "unsupported-json-schema-closed-object",
          message:
            'Closed objects through "additionalProperties: false" are not supported by the current shared IR.',
          path: ["root"],
          nodeKind: "object",
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
});
