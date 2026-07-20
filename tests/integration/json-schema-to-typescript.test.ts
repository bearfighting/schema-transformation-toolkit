import { describe, expect, it } from "vitest";
import { jsonSchemaParser } from "../../packages/parsers/json-schema/src/index.js";
import { typeScriptGenerator } from "../../packages/generators/typescript/src/index.js";

function integerWideningDiagnostic(path: string[]) {
  return {
    severity: "warning" as const,
    code: "integer-widened-to-number",
    message:
      "TypeScript output widens integer semantics to number because the target language has no distinct integer type.",
    path,
    nodeKind: "scalar" as const,
    source: "generator-typescript",
    evidence: {
      sourceScalar: "integer",
      renderedScalar: "number",
    },
  };
}

function integerWideningSemanticNote(path: string[]) {
  return {
    kind: "widening" as const,
    code: "integer-widened-to-number",
    message:
      "TypeScript output widens integer semantics to number because the target language has no distinct integer type.",
    path,
    nodeKind: "scalar" as const,
    source: "generator-typescript",
    layer: "target" as const,
    evidence: {
      sourceScalar: "integer",
      renderedScalar: "number",
    },
  };
}

function unknownWideningDiagnostic(
  path: string[],
  options: {
    reason: string;
    nullable: boolean;
    renderedForm: string;
    sourceEvidence?: Record<string, unknown>;
  },
) {
  return {
    severity: "warning" as const,
    code: "wide-unknown-type",
    message:
      "This schema node renders as TypeScript unknown and may accept values more broadly than the source evidence suggests.",
    path,
    nodeKind: "unknown" as const,
    source: "generator-typescript",
    evidence: {
      reason: options.reason,
      nullable: options.nullable,
      renderedForm: options.renderedForm,
      ...(options.sourceEvidence
        ? { sourceEvidence: options.sourceEvidence }
        : {}),
    },
  };
}

function unknownWideningSemanticNote(
  path: string[],
  options: {
    reason: string;
    nullable: boolean;
    renderedForm: string;
    sourceEvidence?: Record<string, unknown>;
  },
) {
  return {
    kind: "widening" as const,
    code: "wide-unknown-type",
    message:
      "This schema node renders as TypeScript unknown and may accept values more broadly than the source evidence suggests.",
    path,
    nodeKind: "unknown" as const,
    source: "generator-typescript",
    layer: "target" as const,
    evidence: {
      reason: options.reason,
      nullable: options.nullable,
      renderedForm: options.renderedForm,
      ...(options.sourceEvidence
        ? { sourceEvidence: options.sourceEvidence }
        : {}),
    },
  };
}

function unknownUnionWideningDiagnostic(
  path: string[],
  unknownMemberIndexes: number[],
  memberKinds: string[] = ["literal", "unknown"],
) {
  return {
    severity: "warning" as const,
    code: "unknown-union-member-absorbs-union",
    message:
      "This union includes an unknown member, so the rendered TypeScript union may accept values more broadly than the non-unknown branches suggest.",
    path,
    nodeKind: "union" as const,
    source: "generator-typescript",
    evidence: {
      unknownMemberIndexes,
      memberKinds,
    },
  };
}

function unknownUnionWideningSemanticNote(
  path: string[],
  unknownMemberIndexes: number[],
  memberKinds: string[] = ["literal", "unknown"],
) {
  return {
    kind: "widening" as const,
    code: "unknown-union-member-absorbs-union",
    message:
      "This union includes an unknown member, so the rendered TypeScript union may accept values more broadly than the non-unknown branches suggest.",
    path,
    nodeKind: "union" as const,
    source: "generator-typescript",
    layer: "target" as const,
    evidence: {
      unknownMemberIndexes,
      memberKinds,
    },
  };
}

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

    if (!parsed.ok) {
      throw new Error("Expected the JSON Schema parser to succeed.");
    }

    expect(typeScriptGenerator.generate(parsed.document)).toEqual({
      ok: true,
      output: [
        "export interface User {",
        "  id: number;",
        "  name?: string | null;",
        "}",
      ].join("\n"),
      diagnostics: [integerWideningDiagnostic(["root", "id"])],
      semanticNotes: [integerWideningSemanticNote(["root", "id"])],
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

    if (!parsed.ok) {
      throw new Error("Expected the JSON Schema parser to succeed.");
    }

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

    if (!recordParsed.ok) {
      throw new Error("Expected the JSON Schema parser to succeed.");
    }

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

    if (!nestedTrueParsed.ok) {
      throw new Error("Expected the JSON Schema parser to succeed.");
    }

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

    if (!parsed.ok) {
      throw new Error("Expected the JSON Schema parser to succeed.");
    }

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

    if (!parsed.ok) {
      throw new Error("Expected the JSON Schema parser to succeed.");
    }

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
