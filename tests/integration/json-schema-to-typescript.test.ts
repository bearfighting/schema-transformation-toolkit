import { describe, expect, it } from "vitest";
import { jsonSchemaParser } from "../../packages/parsers/json-schema/src/index.js";
import { typeScriptGenerator } from "../../packages/generators/typescript/src/index.js";

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
    });
  });
});
