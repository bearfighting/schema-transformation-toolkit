import { describe, expect, it } from "vitest";
import { jsonSchemaParser } from "../../packages/parsers/json-schema/src/index.js";
import { jsonSchemaGenerator } from "../../packages/generators/json-schema/src/index.js";

describe("integration: json-schema -> ir -> json-schema", () => {
  it("round-trips the current generator-aligned object subset", () => {
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

    if (!parsed.ok) {
      throw new Error("Expected the JSON Schema parser to succeed.");
    }

    expect(jsonSchemaGenerator.generate(parsed.document)).toEqual({
      ok: true,
      output: {
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
      },
    });
  });

  it("round-trips reusable definitions and root refs", () => {
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

    if (!parsed.ok) {
      throw new Error("Expected the JSON Schema parser to succeed.");
    }

    expect(jsonSchemaGenerator.generate(parsed.document)).toEqual({
      ok: true,
      output: {
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
      },
    });
  });

  it("round-trips open records and nested true schemas through the current IR boundary", () => {
    const recordParsed = jsonSchemaParser.parse(
      JSON.stringify({
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "OpenDictionary",
        type: "object",
        additionalProperties: true,
      }),
    );

    if (!recordParsed.ok) {
      throw new Error("Expected the JSON Schema parser to succeed.");
    }

    expect(jsonSchemaGenerator.generate(recordParsed.document)).toEqual({
      ok: true,
      output: {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "OpenDictionary",
        type: "object",
        additionalProperties: true,
      },
      diagnostics: [
        {
          severity: "warning",
          code: "wide-unknown-schema",
          message:
            "This schema node renders as the widest JSON Schema and may accept values more broadly than the source evidence suggests.",
          path: ["root", "value"],
          nodeKind: "unknown",
          source: "generator-json-schema",
          evidence: {
            reason: "no-evidence",
            nullable: false,
            renderedForm: "true-schema",
            sourceEvidence: {
              source: "parser-json",
              detail:
                'A JSON Schema "additionalProperties: true" map was lowered to Record<string, unknown>.',
            },
          },
        },
      ],
    });

    const nestedTrueParsed = jsonSchemaParser.parse(
      JSON.stringify({
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
      }),
    );

    if (!nestedTrueParsed.ok) {
      throw new Error("Expected the JSON Schema parser to succeed.");
    }

    expect(jsonSchemaGenerator.generate(nestedTrueParsed.document)).toEqual({
      ok: true,
      output: {
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
      },
      diagnostics: [
        {
          severity: "warning",
          code: "wide-unknown-schema",
          message:
            "This schema node renders as the widest JSON Schema and may accept values more broadly than the source evidence suggests.",
          path: ["root", "tags", "elementType"],
          nodeKind: "unknown",
          source: "generator-json-schema",
          evidence: {
            reason: "no-evidence",
            nullable: false,
            renderedForm: "true-schema",
            sourceEvidence: {
              source: "parser-json",
              detail: "JSON Schema boolean true was lowered to unknown.",
            },
          },
        },
      ],
    });
  });

  it("round-trips tuple schemas in the generator-aligned form", () => {
    const parsed = jsonSchemaParser.parse(
      JSON.stringify({
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "CoordinatePair",
        type: "array",
        prefixItems: [{ type: "integer" }, { type: "string" }],
        minItems: 1,
        items: false,
      }),
    );

    if (!parsed.ok) {
      throw new Error("Expected the JSON Schema parser to succeed.");
    }

    expect(jsonSchemaGenerator.generate(parsed.document)).toEqual({
      ok: true,
      output: {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "CoordinatePair",
        type: "array",
        prefixItems: [{ type: "integer" }, { type: "string" }],
        minItems: 1,
        items: false,
      },
    });
  });

  it("round-trips typed record schemas without widening", () => {
    const parsed = jsonSchemaParser.parse(
      JSON.stringify({
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "FeatureFlags",
        type: "object",
        additionalProperties: {
          type: "boolean",
        },
      }),
    );

    if (!parsed.ok) {
      throw new Error("Expected the JSON Schema parser to succeed.");
    }

    expect(jsonSchemaGenerator.generate(parsed.document)).toEqual({
      ok: true,
      output: {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "FeatureFlags",
        type: "object",
        additionalProperties: {
          type: "boolean",
        },
      },
    });
  });

  it("normalizes anyOf unions to the current generator default oneOf shape", () => {
    const parsed = jsonSchemaParser.parse(
      JSON.stringify({
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "Result",
        anyOf: [{ const: "open" }, { const: true }],
      }),
    );

    if (!parsed.ok) {
      throw new Error("Expected the JSON Schema parser to succeed.");
    }

    expect(jsonSchemaGenerator.generate(parsed.document)).toEqual({
      ok: true,
      output: {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "Result",
        oneOf: [{ const: "open" }, { const: true }],
      },
    });
  });

  it("treats metadata-only roots and explicit true roots as the same wide root output", () => {
    const metadataOnlyParsed = jsonSchemaParser.parse(
      JSON.stringify({
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "UnknownValue",
      }),
    );
    const explicitTrueParsed = jsonSchemaParser.parse("true", {
      name: "UnknownValue",
    });

    if (!metadataOnlyParsed.ok || !explicitTrueParsed.ok) {
      throw new Error("Expected both JSON Schema parses to succeed.");
    }

    const expected = {
      ok: true as const,
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
            sourceEvidence: {
              source: "parser-json",
              detail: "Metadata-only root schema was lowered to unknown.",
            },
          },
        },
      ],
    };

    expect(jsonSchemaGenerator.generate(metadataOnlyParsed.document)).toEqual(
      expected,
    );
    expect(jsonSchemaGenerator.generate(explicitTrueParsed.document)).toEqual({
      ...expected,
      diagnostics: [
        {
          ...expected.diagnostics[0],
          evidence: {
            reason: "no-evidence",
            nullable: false,
            renderedForm: "metadata-only-root",
            sourceEvidence: {
              source: "parser-json",
              detail: "JSON Schema boolean true was lowered to unknown.",
            },
          },
        },
      ],
    });
  });

  it("round-trips definitions that combine tuple, record, refs, and nullable fields", () => {
    const parsed = jsonSchemaParser.parse(
      JSON.stringify({
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "BundleDocument",
        $defs: {
          Point: {
            type: "array",
            prefixItems: [{ type: "number" }, { type: "number" }],
            minItems: 2,
            items: false,
          },
          FeatureFlags: {
            type: "object",
            additionalProperties: {
              type: "boolean",
            },
          },
          User: {
            type: "object",
            properties: {
              id: {
                type: "string",
              },
              nickname: {
                type: ["string", "null"],
              },
              home: {
                $ref: "#/$defs/Point",
              },
              flags: {
                $ref: "#/$defs/FeatureFlags",
              },
            },
            required: ["id", "home", "flags"],
          },
          Bundle: {
            type: "object",
            properties: {
              users: {
                type: "array",
                items: {
                  $ref: "#/$defs/User",
                },
              },
            },
            required: ["users"],
          },
        },
        $ref: "#/$defs/Bundle",
      }),
    );

    if (!parsed.ok) {
      throw new Error("Expected the JSON Schema parser to succeed.");
    }

    expect(jsonSchemaGenerator.generate(parsed.document)).toEqual({
      ok: true,
      output: {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "BundleDocument",
        $defs: {
          Point: {
            type: "array",
            prefixItems: [{ type: "number" }, { type: "number" }],
            minItems: 2,
            items: false,
          },
          FeatureFlags: {
            type: "object",
            additionalProperties: {
              type: "boolean",
            },
          },
          User: {
            type: "object",
            properties: {
              id: {
                type: "string",
              },
              nickname: {
                type: ["string", "null"],
              },
              home: {
                $ref: "#/$defs/Point",
              },
              flags: {
                $ref: "#/$defs/FeatureFlags",
              },
            },
            required: ["id", "home", "flags"],
          },
          Bundle: {
            type: "object",
            properties: {
              users: {
                type: "array",
                items: {
                  $ref: "#/$defs/User",
                },
              },
            },
            required: ["users"],
          },
        },
        $ref: "#/$defs/Bundle",
      },
    });
  });

  it("round-trips definitions with open-record widening and nested true schemas", () => {
    const parsed = jsonSchemaParser.parse(
      JSON.stringify({
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "LooseBundleDocument",
        $defs: {
          LooseMap: {
            type: "object",
            additionalProperties: true,
          },
          User: {
            type: "object",
            properties: {
              metadata: true,
              tags: {
                type: "array",
                items: true,
              },
              extras: {
                $ref: "#/$defs/LooseMap",
              },
            },
            required: ["metadata", "tags", "extras"],
          },
        },
        type: "array",
        items: {
          $ref: "#/$defs/User",
        },
      }),
    );

    if (!parsed.ok) {
      throw new Error("Expected the JSON Schema parser to succeed.");
    }

    expect(jsonSchemaGenerator.generate(parsed.document)).toEqual({
      ok: true,
      output: {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "LooseBundleDocument",
        $defs: {
          LooseMap: {
            type: "object",
            additionalProperties: true,
          },
          User: {
            type: "object",
            properties: {
              metadata: true,
              tags: {
                type: "array",
                items: true,
              },
              extras: {
                $ref: "#/$defs/LooseMap",
              },
            },
            required: ["metadata", "tags", "extras"],
          },
        },
        type: "array",
        items: {
          $ref: "#/$defs/User",
        },
      },
      diagnostics: [
        {
          severity: "warning",
          code: "wide-unknown-schema",
          message:
            "This schema node renders as the widest JSON Schema and may accept values more broadly than the source evidence suggests.",
          path: ["definitions", "LooseMap", "value"],
          nodeKind: "unknown",
          source: "generator-json-schema",
          evidence: {
            reason: "no-evidence",
            nullable: false,
            renderedForm: "true-schema",
            sourceEvidence: {
              source: "parser-json",
              detail:
                'A JSON Schema "additionalProperties: true" map was lowered to Record<string, unknown>.',
            },
          },
        },
        {
          severity: "warning",
          code: "wide-unknown-schema",
          message:
            "This schema node renders as the widest JSON Schema and may accept values more broadly than the source evidence suggests.",
          path: ["definitions", "User", "metadata"],
          nodeKind: "unknown",
          source: "generator-json-schema",
          evidence: {
            reason: "no-evidence",
            nullable: false,
            renderedForm: "true-schema",
            sourceEvidence: {
              source: "parser-json",
              detail: "JSON Schema boolean true was lowered to unknown.",
            },
          },
        },
        {
          severity: "warning",
          code: "wide-unknown-schema",
          message:
            "This schema node renders as the widest JSON Schema and may accept values more broadly than the source evidence suggests.",
          path: ["definitions", "User", "tags", "elementType"],
          nodeKind: "unknown",
          source: "generator-json-schema",
          evidence: {
            reason: "no-evidence",
            nullable: false,
            renderedForm: "true-schema",
            sourceEvidence: {
              source: "parser-json",
              detail: "JSON Schema boolean true was lowered to unknown.",
            },
          },
        },
      ],
    });
  });

  it("fails explicitly for closed objects instead of pretending to round-trip them", () => {
    expect(
      jsonSchemaParser.parse(
        JSON.stringify({
          $schema: "https://json-schema.org/draft/2020-12/schema",
          title: "ClosedUser",
          type: "object",
          properties: {
            id: {
              type: "string",
            },
          },
          required: ["id"],
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
          $schema: "https://json-schema.org/draft/2020-12/schema",
          title: "UserMap",
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

  it("fails explicitly for broader type arrays instead of treating them as general unions", () => {
    expect(
      jsonSchemaParser.parse(
        JSON.stringify({
          $schema: "https://json-schema.org/draft/2020-12/schema",
          title: "EitherStringOrNumber",
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

  it("fails explicitly for allOf-based schemas instead of silently dropping composition semantics", () => {
    expect(
      jsonSchemaParser.parse(
        JSON.stringify({
          $schema: "https://json-schema.org/draft/2020-12/schema",
          title: "ComposedUser",
          allOf: [
            {
              type: "object",
              properties: {
                id: {
                  type: "string",
                },
              },
              required: ["id"],
            },
            {
              type: "object",
              properties: {
                active: {
                  type: "boolean",
                },
              },
              required: ["active"],
            },
          ],
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
  });

  it("fails explicitly for external refs instead of assuming cross-document resolution", () => {
    expect(
      jsonSchemaParser.parse(
        JSON.stringify({
          $schema: "https://json-schema.org/draft/2020-12/schema",
          title: "RemoteUser",
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
  });
});
