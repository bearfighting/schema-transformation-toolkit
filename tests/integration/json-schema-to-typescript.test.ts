import { describe, expect, it } from "vitest";
import { jsonSchemaParser } from "../../packages/parsers/json-schema/src/index.js";
import { typeScriptGenerator } from "../../packages/generators/typescript/src/index.js";
import { expectOk } from "../helpers/result-assertions.js";
import {
  unknownUnionWideningDiagnostic,
  unknownUnionWideningSemanticNote,
  unknownWideningDiagnostic,
  unknownWideningSemanticNote,
} from "../helpers/typescript-generator-events.js";

describe("integration: json-schema -> ir -> typescript", () => {
  it("converts the current generator-aligned subset into TypeScript", () => {
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

    expect(typeScriptGenerator.generate(parsed.document)).toMatchObject({
      ok: true,
      output: [
        "export interface User {",
        "  id: number;",
        "  name?: string | null;",
        "}",
      ].join("\n"),
    });
  });

  it("converts reusable definitions and root refs into TypeScript aliases", () => {
    const parsed = jsonSchemaParser.parse(
      JSON.stringify({
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

    expect(typeScriptGenerator.generate(parsed.document)).toEqual({
      ok: true,
      output: [
        "export interface User {",
        "  id: number;",
        "}",
        "",
        "export type Response = User[];",
        "",
        "export type ResponseDocument = Response;",
      ].join("\n"),
    });
  });

  it("converts additionalProperties: true and nested true schemas into current unknown semantics", () => {
    const recordParsed = jsonSchemaParser.parse(
      JSON.stringify({
        title: "OpenDictionary",
        type: "object",
        additionalProperties: true,
      }),
    );

    expectOk(recordParsed, "Expected the JSON Schema parser to succeed.");

    expect(typeScriptGenerator.generate(recordParsed.document)).toEqual({
      ok: true,
      output: "export type OpenDictionary = Record<string, unknown>;",
      diagnostics: [
        unknownWideningDiagnostic(["root", "value"], {
          reason: "no-evidence",
          nullable: false,
          renderedForm: "unknown",
          sourceEvidence: {
            source: "parser-json",
            detail:
              'A JSON Schema "additionalProperties: true" map was lowered to Record<string, unknown>.',
          },
        }),
      ],
      semanticNotes: [
        unknownWideningSemanticNote(["root", "value"], {
          reason: "no-evidence",
          nullable: false,
          renderedForm: "unknown",
          sourceEvidence: {
            source: "parser-json",
            detail:
              'A JSON Schema "additionalProperties: true" map was lowered to Record<string, unknown>.',
          },
        }),
      ],
    });

    const nestedTrueParsed = jsonSchemaParser.parse(
      JSON.stringify({
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

    expect(typeScriptGenerator.generate(nestedTrueParsed.document)).toEqual({
      ok: true,
      output: [
        "export interface PartialShape {",
        "  tags: unknown[];",
        "}",
      ].join("\n"),
      diagnostics: [
        unknownWideningDiagnostic(["root", "tags", "elementType"], {
          reason: "no-evidence",
          nullable: false,
          renderedForm: "unknown",
          sourceEvidence: {
            source: "parser-json",
            detail: "JSON Schema boolean true was lowered to unknown.",
          },
        }),
      ],
      semanticNotes: [
        unknownWideningSemanticNote(["root", "tags", "elementType"], {
          reason: "no-evidence",
          nullable: false,
          renderedForm: "unknown",
          sourceEvidence: {
            source: "parser-json",
            detail: "JSON Schema boolean true was lowered to unknown.",
          },
        }),
      ],
    });
  });

  it("reports widened unions when json-schema lowering introduces unknown branches", () => {
    const parsed = jsonSchemaParser.parse(
      JSON.stringify({
        title: "WideValues",
        anyOf: [{ const: "open" }, true],
      }),
    );

    expectOk(parsed, "Expected the JSON Schema parser to succeed.");

    expect(typeScriptGenerator.generate(parsed.document)).toEqual({
      ok: true,
      output: 'export type WideValues = "open" | unknown;',
      diagnostics: [
        unknownUnionWideningDiagnostic(["root"], [1]),
        unknownWideningDiagnostic(["root", "1"], {
          reason: "no-evidence",
          nullable: false,
          renderedForm: "unknown",
          sourceEvidence: {
            source: "parser-json",
            detail: "JSON Schema boolean true was lowered to unknown.",
          },
        }),
      ],
      semanticNotes: [
        unknownUnionWideningSemanticNote(["root"], [1]),
        unknownWideningSemanticNote(["root", "1"], {
          reason: "no-evidence",
          nullable: false,
          renderedForm: "unknown",
          sourceEvidence: {
            source: "parser-json",
            detail: "JSON Schema boolean true was lowered to unknown.",
          },
        }),
      ],
    });
  });

  it("reports widened unions when a referenced definition resolves to unknown", () => {
    const parsed = jsonSchemaParser.parse(
      JSON.stringify({
        title: "WideValuesDocument",
        $defs: {
          FallbackValue: true,
          WideValues: {
            anyOf: [{ const: "open" }, { $ref: "#/$defs/FallbackValue" }],
          },
        },
        $ref: "#/$defs/WideValues",
      }),
    );

    expectOk(parsed, "Expected the JSON Schema parser to succeed.");

    expect(typeScriptGenerator.generate(parsed.document)).toEqual({
      ok: true,
      output: [
        "export type FallbackValue = unknown;",
        "",
        'export type WideValues = "open" | FallbackValue;',
        "",
        "export type WideValuesDocument = WideValues;",
      ].join("\n"),
      diagnostics: [
        unknownWideningDiagnostic(["definitions", "FallbackValue"], {
          reason: "no-evidence",
          nullable: false,
          renderedForm: "unknown",
          sourceEvidence: {
            source: "parser-json",
            detail: "JSON Schema boolean true was lowered to unknown.",
          },
        }),
        unknownUnionWideningDiagnostic(
          ["definitions", "WideValues"],
          [1],
          ["literal", "reference"],
        ),
      ],
      semanticNotes: [
        unknownWideningSemanticNote(["definitions", "FallbackValue"], {
          reason: "no-evidence",
          nullable: false,
          renderedForm: "unknown",
          sourceEvidence: {
            source: "parser-json",
            detail: "JSON Schema boolean true was lowered to unknown.",
          },
        }),
        unknownUnionWideningSemanticNote(
          ["definitions", "WideValues"],
          [1],
          ["literal", "reference"],
        ),
      ],
    });
  });
});
