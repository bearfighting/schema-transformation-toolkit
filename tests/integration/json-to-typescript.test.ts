import { describe, expect, it } from "vitest";
import { createNamingStrategy } from "../../packages/core/src/index.js";
import {
  configureTypeScriptGenerator,
  tryGenerateTypeScript,
  typeScriptGenerator,
} from "../../packages/generator-typescript/src/index.js";
import {
  configureJsonParser,
  jsonSchemaParser,
  preparedJsonSchemaParserOptions,
} from "../../packages/parser-json/src/index.js";

describe("integration: json -> ir -> typescript", () => {
  it("converts supported json samples into TypeScript with default parser/generator instances", () => {
    const parsed = jsonSchemaParser.parse(
      '[{"id":1,"profile":{"display-name":"Ada"}},{"id":2,"profile":{"display-name":"Linus","is-active":true}}]',
      {
        name: "user-profile-list",
      },
    );

    expect(parsed).toEqual({
      ok: true,
      document: parsed.ok ? parsed.document : undefined,
    });

    if (!parsed.ok) {
      throw new Error("Expected the JSON parser to succeed.");
    }

    expect(typeScriptGenerator.generate(parsed.document)).toEqual({
      ok: true,
      output: [
        "export type UserProfileList = Array<{",
        "  id: number;",
        "  profile: {",
        "    displayName: string;",
        "    isActive?: boolean;",
        "  };",
        "}>;",
      ].join("\n"),
    });
  });

  it("preserves optional and nullable field semantics across the full pipeline", () => {
    const parsed = jsonSchemaParser.parse(
      '[{"id":1,"name":"Ada"},{"id":2,"name":null},{"id":3}]',
      {
        name: "user-list",
      },
    );

    if (!parsed.ok) {
      throw new Error("Expected the JSON parser to succeed.");
    }

    expect(typeScriptGenerator.generate(parsed.document)).toEqual({
      ok: true,
      output: [
        "export type UserList = Array<{",
        "  id: number;",
        "  name?: string | null;",
        "}>;",
      ].join("\n"),
    });
  });

  it("preserves unresolved unknown semantics across the full pipeline", () => {
    const topLevelNull = jsonSchemaParser.parse("null", {
      name: "standalone-null",
    });
    const partialShape = jsonSchemaParser.parse('{"name":null,"tags":[]}', {
      name: "partial-shape",
    });

    if (!topLevelNull.ok || !partialShape.ok) {
      throw new Error("Expected the JSON parser to succeed for unresolved semantics.");
    }

    expect(typeScriptGenerator.generate(topLevelNull.document)).toEqual({
      ok: true,
      output: "export type StandaloneNull = unknown | null;",
    });

    expect(typeScriptGenerator.generate(partialShape.document)).toEqual({
      ok: true,
      output: [
        "export interface PartialShape {",
        "  name: unknown | null;",
        "  tags: unknown[];",
        "}",
      ].join("\n"),
    });
  });

  it("supports configured parser and generator instances in the same pipeline", () => {
    const configuredParser = configureJsonParser(
      (input, options) => jsonSchemaParser.parse(input, { name: options.name }),
      {
        name: "user-profile",
      },
    );
    const configuredGenerator = configureTypeScriptGenerator({
      namingStrategy: createNamingStrategy({
        typeName: {
          style: "snake",
          invalidPrefix: "_",
          reservedWordHandling: "suffix",
          reservedWordSuffix: "_",
        },
        fieldName: {
          style: "snake",
          invalidPrefix: "_",
          reservedWordHandling: "suffix",
          reservedWordSuffix: "_",
        },
      }),
    });

    expect(configuredParser.prepared.errors).toEqual([]);
    expect(configuredGenerator.prepared.errors).toEqual([]);

    const parsed = configuredParser.parser.parse(
      '{"user-id":1,"profile":{"display-name":"Ada"}}',
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
        "}",
      ].join("\n"),
    });
  });

  it("supports numeric and rendering configuration together in the same pipeline", () => {
    const configuredParser = configureJsonParser(
      (input, options) => jsonSchemaParser.parse(input, options),
      {
        name: "numeric-list",
        inference: {
          numericMode: "number-only",
        },
      },
    );
    const configuredGenerator = configureTypeScriptGenerator({
      rootObjectMode: "type",
      arrayStyle: "compact",
    });

    const parsed = configuredParser.parser.parse('[{"value":1},{"value":2}]');

    if (!parsed.ok) {
      throw new Error("Expected the configured JSON parser to succeed.");
    }

    expect(configuredGenerator.generator.generate(parsed.document)).toEqual({
      ok: true,
      output: [
        "export type NumericList = ({",
        "  value: number;",
        "})[];",
      ].join("\n"),
    });
  });

  it("surfaces unsupported parser behavior before generation for invalid inference cases", () => {
    expect(preparedJsonSchemaParserOptions.errors).toEqual([]);

    const parsed = jsonSchemaParser.parse('[1,"a"]', {
      name: "mixed-array",
    });

    expect(parsed).toEqual({
      ok: false,
      code: "unsupported-mixed-types",
      message:
        "The input is valid JSON, but array elements do not share a common inferable type in AST v0.",
    });
  });

  it("surfaces structured generator failures in the integrated pipeline", () => {
    const parsed = jsonSchemaParser.parse('{"user_id":1}', {
      name: "user-profile",
    });

    if (!parsed.ok) {
      throw new Error("Expected the JSON parser to succeed.");
    }

    expect(
      tryGenerateTypeScript(parsed.document, {
        namingStrategy: {
          renderTypeName() {
            return '"user-profile"';
          },
          renderFieldName(name) {
            return name.source;
          },
        },
      }),
    ).toEqual({
      ok: false,
      code: "invalid-type-name",
      message:
        'The rendered type name ""user-profile"" is not a valid TypeScript identifier.',
    });
  });
});
