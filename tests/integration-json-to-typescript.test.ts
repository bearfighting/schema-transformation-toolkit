import { describe, expect, it } from "vitest";
import { createNamingStrategy } from "../packages/core/src/index.js";
import {
  configureTypeScriptGenerator,
  typeScriptGenerator
} from "../packages/generator-typescript/src/index.js";
import {
  configureJsonParser,
  jsonSchemaParser,
  preparedJsonSchemaParserOptions
} from "../packages/parser-json/src/index.js";

describe("integration: json -> ir -> typescript", () => {
  it("converts supported json samples into TypeScript with default parser/generator instances", () => {
    const parsed = jsonSchemaParser.parse(
      '[{"id":1,"profile":{"display-name":"Ada"}},{"id":2,"profile":{"display-name":"Linus","is-active":true}}]',
      {
        name: "user-profile-list"
      }
    );

    expect(parsed).toEqual({
      ok: true,
      document: parsed.ok ? parsed.document : undefined
    });

    if (!parsed.ok) {
      throw new Error("Expected the JSON parser to succeed.");
    }

    expect(typeScriptGenerator.generate(parsed.document)).toEqual({
      ok: true,
      output: [
        "export type UserProfileList = ({",
        "  id: number;",
        "  profile: {",
        "    displayName: string;",
        "    isActive?: boolean;",
        "  };",
        "})[];"
      ].join("\n")
    });
  });

  it("supports configured parser and generator instances in the same pipeline", () => {
    const configuredParser = configureJsonParser(
      (input, options) => jsonSchemaParser.parse(input, { name: options.name }),
      {
        name: "user-profile"
      }
    );
    const configuredGenerator = configureTypeScriptGenerator({
      namingStrategy: createNamingStrategy({
        typeName: {
          style: "snake",
          invalidPrefix: "_",
          reservedWordHandling: "suffix",
          reservedWordSuffix: "_"
        },
        fieldName: {
          style: "snake",
          invalidPrefix: "_",
          reservedWordHandling: "suffix",
          reservedWordSuffix: "_"
        }
      })
    });

    expect(configuredParser.prepared.errors).toEqual([]);
    expect(configuredGenerator.prepared.errors).toEqual([]);

    const parsed = configuredParser.parser.parse(
      '{"user-id":1,"profile":{"display-name":"Ada"}}'
    );

    if (!parsed.ok) {
      throw new Error("Expected the configured JSON parser to succeed.");
    }

    expect(configuredGenerator.generator.generate(parsed.document)).toEqual({
      ok: true,
      output: [
        "export interface user_profile {",
        "  user_id: number;",
        "  profile: {",
        "    display_name: string;",
        "  };",
        "}"
      ].join("\n")
    });
  });

  it("surfaces unsupported parser behavior before generation for invalid inference cases", () => {
    expect(preparedJsonSchemaParserOptions.errors).toEqual([]);

    const parsed = jsonSchemaParser.parse('[1,"a"]', {
      name: "mixed-array"
    });

    expect(parsed).toEqual({
      ok: false,
      code: "unsupported-mixed-types",
      message:
        "The input is valid JSON, but array elements do not share a common inferable type in AST v0."
    });
  });
});
