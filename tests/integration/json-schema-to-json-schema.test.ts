import { describe, expect, it } from "vitest";
import { jsonSchemaParser } from "../../packages/parsers/json-schema/src/index.js";
import { jsonSchemaGenerator } from "../../packages/generators/json-schema/src/index.js";
import {
  expectDiagnosticCode,
  expectSemanticNoteCode,
} from "../helpers/diagnostic-assertions.js";
import { expectOk } from "../helpers/result-assertions.js";

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

    expectOk(parsed, "Expected the JSON Schema parser to succeed.");

    const result = jsonSchemaGenerator.generate(parsed.document);

    expect(result).toMatchObject({
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

    expectOk(parsed, "Expected the JSON Schema parser to succeed.");

    const result = jsonSchemaGenerator.generate(parsed.document);

    expect(result).toMatchObject({
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

    expectOk(recordParsed, "Expected the JSON Schema parser to succeed.");

    const recordResult = jsonSchemaGenerator.generate(recordParsed.document);

    expect(recordResult).toMatchObject({
      ok: true,
      output: {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "OpenDictionary",
        type: "object",
        additionalProperties: true,
      },
    });

    expect(recordResult.ok).toBe(true);

    if (!recordResult.ok) {
      return;
    }

    expect(recordResult.diagnostics).toHaveLength(1);
    expect(recordResult.semanticNotes).toHaveLength(1);
    expectDiagnosticCode(recordResult.diagnostics, "wide-unknown-schema");
    expectSemanticNoteCode(recordResult.semanticNotes, "wide-unknown-schema");

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

    expectOk(nestedTrueParsed, "Expected the JSON Schema parser to succeed.");

    const nestedTrueResult = jsonSchemaGenerator.generate(
      nestedTrueParsed.document,
    );

    expect(nestedTrueResult).toMatchObject({
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
    });

    expect(nestedTrueResult.ok).toBe(true);

    if (!nestedTrueResult.ok) {
      return;
    }

    expect(nestedTrueResult.diagnostics).toHaveLength(1);
    expect(nestedTrueResult.semanticNotes).toHaveLength(1);
    expectDiagnosticCode(nestedTrueResult.diagnostics, "wide-unknown-schema");
    expectSemanticNoteCode(
      nestedTrueResult.semanticNotes,
      "wide-unknown-schema",
    );
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

    expectOk(parsed, "Expected the JSON Schema parser to succeed.");

    const result = jsonSchemaGenerator.generate(parsed.document);

    expect(result).toMatchObject({
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

    expectOk(parsed, "Expected the JSON Schema parser to succeed.");

    const result = jsonSchemaGenerator.generate(parsed.document);

    expect(result).toMatchObject({
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

    expectOk(parsed, "Expected the JSON Schema parser to succeed.");

    const result = jsonSchemaGenerator.generate(parsed.document);

    expect(result).toMatchObject({
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

    expectOk(
      metadataOnlyParsed,
      "Expected both JSON Schema parses to succeed.",
    );
    expectOk(
      explicitTrueParsed,
      "Expected both JSON Schema parses to succeed.",
    );

    const metadataOnlyResult = jsonSchemaGenerator.generate(
      metadataOnlyParsed.document,
    );
    const explicitTrueResult = jsonSchemaGenerator.generate(
      explicitTrueParsed.document,
    );

    expect(metadataOnlyResult).toMatchObject({
      ok: true,
      output: {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "UnknownValue",
      },
    });
    expect(explicitTrueResult).toMatchObject({
      ok: true,
      output: {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "UnknownValue",
      },
    });

    expect(metadataOnlyResult.ok).toBe(true);
    expect(explicitTrueResult.ok).toBe(true);

    if (!metadataOnlyResult.ok || !explicitTrueResult.ok) {
      return;
    }

    expect(metadataOnlyResult.diagnostics).toHaveLength(1);
    expect(metadataOnlyResult.semanticNotes).toHaveLength(1);
    expect(explicitTrueResult.diagnostics).toHaveLength(1);
    expect(explicitTrueResult.semanticNotes).toHaveLength(1);
    expectDiagnosticCode(metadataOnlyResult.diagnostics, "wide-unknown-schema");
    expectSemanticNoteCode(
      metadataOnlyResult.semanticNotes,
      "wide-unknown-schema",
    );
    expectDiagnosticCode(explicitTrueResult.diagnostics, "wide-unknown-schema");
    expectSemanticNoteCode(
      explicitTrueResult.semanticNotes,
      "wide-unknown-schema",
    );
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

    expectOk(parsed, "Expected the JSON Schema parser to succeed.");

    const result = jsonSchemaGenerator.generate(parsed.document);

    expect(result).toMatchObject({
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

    expectOk(parsed, "Expected the JSON Schema parser to succeed.");

    const result = jsonSchemaGenerator.generate(parsed.document);

    expect(result).toMatchObject({
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
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.diagnostics).toHaveLength(3);
    expect(result.semanticNotes).toHaveLength(3);
    expect(
      result.diagnostics?.every((diagnostic) =>
        diagnostic.code === "wide-unknown-schema",
      ),
    ).toBe(true);
    expect(
      result.semanticNotes?.every((semanticNote) =>
        semanticNote.code === "wide-unknown-schema",
      ),
    ).toBe(true);
  });

  it("parses closed objects into shape plus constraint artifacts", () => {
    const parsed = jsonSchemaParser.parse(
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
    );

    expect(parsed.ok).toBe(true);

    expectOk(parsed, "Expected the JSON Schema parser to succeed.");

    expect(parsed.constraints).toEqual({
      kind: "constraint-document",
      name: "ClosedUser",
      entries: [
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
    });

    expect(jsonSchemaGenerator.generate(parsed.document)).toEqual({
      ok: true,
      output: {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "ClosedUser",
        type: "object",
        properties: {
          id: {
            type: "string",
          },
        },
        required: ["id"],
      },
    });
  });

  it("round-trips extracted constraints back into json schema output", () => {
    const parsed = jsonSchemaParser.parse(
      JSON.stringify({
        $schema: "https://json-schema.org/draft/2020-12/schema",
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

    expectOk(parsed, "Expected the JSON Schema parser to succeed.");

    expect(
      jsonSchemaGenerator.generate(parsed.document, {
        ...(parsed.constraints ? { constraints: parsed.constraints } : {}),
      }),
    ).toEqual({
      ok: true,
      output: {
        $schema: "https://json-schema.org/draft/2020-12/schema",
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
      },
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
