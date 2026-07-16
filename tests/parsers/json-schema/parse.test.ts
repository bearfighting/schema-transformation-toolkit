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
  });
});
