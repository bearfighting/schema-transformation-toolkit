import { describe, expect, it } from "vitest";
import {
  createNamingStrategy,
  schemaArrayNode,
  schemaDefinition,
  schemaDocument,
  schemaFieldNode,
  schemaObjectNode,
  schemaReferenceNode,
  schemaScalarNode,
  schemaUnknownNode,
} from "../../packages/core/src/index.js";
import {
  configureTypeScriptGenerator,
  tryGenerateTypeScript,
  typeScriptGenerator,
} from "../../packages/generators/typescript/src/index.js";
import {
  configureJsonParser,
  jsonParser,
  preparedJsonParserOptions,
} from "../../packages/parsers/json/src/index.js";

describe("integration: json -> ir -> typescript", () => {
  it("converts supported json samples into TypeScript with default parser/generator instances", () => {
    const parsed = jsonParser.parse(
      '[{"id":1,"profile":{"display-name":"Ada"}},{"id":2,"profile":{"display-name":"Linus","is-active":true}}]',
      {
        name: "user-profile-list",
      },
    );

    if (!parsed.ok) {
      throw new Error("Expected the JSON parser to succeed.");
    }

    expect(parsed.document.name.source).toBe("user-profile-list");
    expect(parsed.document.root.kind).toBe("array");

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
    const parsed = jsonParser.parse(
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
    const topLevelNull = jsonParser.parse("null", {
      name: "standalone-null",
    });
    const partialShape = jsonParser.parse('{"name":null,"tags":[]}', {
      name: "partial-shape",
    });

    if (!topLevelNull.ok || !partialShape.ok) {
      throw new Error(
        "Expected the JSON parser to succeed for unresolved semantics.",
      );
    }

    expect(typeScriptGenerator.generate(topLevelNull.document)).toEqual({
      ok: true,
      output: "export type StandaloneNull = null;",
    });

    expect(typeScriptGenerator.generate(partialShape.document)).toEqual({
      ok: true,
      output: [
        "export interface PartialShape {",
        "  name: null;",
        "  tags: unknown[];",
        "}",
      ].join("\n"),
    });
  });

  it("supports configured parser and generator instances in the same pipeline", () => {
    const configuredParser = configureJsonParser(
      (input, options) => jsonParser.parse(input, { name: options.name }),
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
      (input, options) => jsonParser.parse(input, options),
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

  it("preserves inferred tuples across the full pipeline when tuple inference is enabled", () => {
    const parsed = jsonParser.parse('{"pair":[1,"north"]}', {
      name: "coordinate-pair",
      inference: {
        tupleInferenceMode: "heterogeneous-only",
      },
    });

    if (!parsed.ok) {
      throw new Error("Expected the JSON parser to succeed.");
    }

    expect(typeScriptGenerator.generate(parsed.document)).toEqual({
      ok: true,
      output: [
        "export interface CoordinatePair {",
        "  pair: [number, string];",
        "}",
      ].join("\n"),
    });
  });

  it("preserves inferred records across the full pipeline when record inference is enabled", () => {
    const parsed = jsonParser.parse(
      '[{"en":"Hello","fr":"Bonjour"},{"de":"Hallo","es":"Hola"}]',
      {
        name: "translation-table",
        inference: {
          recordInferenceMode: "shared-value-type",
        },
      },
    );

    if (!parsed.ok) {
      throw new Error("Expected the JSON parser to succeed.");
    }

    expect(typeScriptGenerator.generate(parsed.document)).toEqual({
      ok: true,
      output: "export type TranslationTable = Array<Record<string, string>>;",
    });
  });

  it("preserves discriminated object unions across the full pipeline in union mode", () => {
    const parsed = jsonParser.parse(
      '[{"type":"a","value":"x"},{"type":"b","count":1}]',
      {
        name: "discriminated-value",
        inference: {
          mixedTypeMode: "union",
        },
      },
    );

    if (!parsed.ok) {
      throw new Error("Expected the JSON parser to succeed.");
    }

    expect(typeScriptGenerator.generate(parsed.document)).toEqual({
      ok: true,
      output: [
        "export type DiscriminatedValue = Array<{",
        '  type_: "a";',
        "  value: string;",
        "} | {",
        '  type_: "b";',
        "  count: number;",
        "}>;",
      ].join("\n"),
    });
  });

  it("preserves collapsed mixed-type unknown semantics across the full pipeline in unknown mode", () => {
    const parsed = jsonParser.parse('[{"value":1},{"value":"x"}]', {
      name: "mixed-value-unknown",
      inference: {
        mixedTypeMode: "unknown",
      },
    });

    expect(parsed).toEqual({
      ok: true,
      document: schemaDocument(
        "mixed-value-unknown",
        schemaArrayNode(
          schemaObjectNode([
            schemaFieldNode(
              "value",
              schemaUnknownNode({
                reason: "mixed-types-collapsed",
                evidence: {
                  source: "parser-json",
                  observedKinds: ["integer", "string"],
                },
              }),
            ),
          ]),
        ),
      ),
      diagnostics: [
        {
          severity: "info",
          code: "collapsed-mixed-types-to-unknown",
          message:
            'The parser collapsed mixed incompatible samples to unknown because mixedTypeMode was set to "unknown".',
          path: ["value"],
          nodeKind: "unknown",
          source: "parser-json",
          evidence: {
            observedKinds: ["integer", "string"],
          },
        },
      ],
    });

    if (!parsed.ok) {
      throw new Error("Expected the JSON parser to succeed.");
    }

    expect(typeScriptGenerator.generate(parsed.document)).toEqual({
      ok: true,
      output: [
        "export type MixedValueUnknown = Array<{",
        "  value: unknown;",
        "}>;",
      ].join("\n"),
    });
  });

  it("surfaces unsupported parser behavior before generation for invalid inference cases", () => {
    expect(preparedJsonParserOptions.errors).toEqual([]);

    const parsed = jsonParser.parse('[1,"a"]', {
      name: "mixed-array",
    });

    expect(parsed).toEqual({
      ok: false,
      code: "unsupported-mixed-types",
      message:
        "The input is valid JSON, but array elements do not share a common inferable type in schema IR v0.",
      diagnostics: [
        {
          severity: "error",
          code: "unsupported-mixed-types",
          message:
            "The input is valid JSON, but array elements do not share a common inferable type in schema IR v0.",
          path: [],
          source: "parser-json",
        },
      ],
    });
  });

  it("surfaces structured generator failures in the integrated pipeline", () => {
    const parsed = jsonParser.parse('{"user_id":1}', {
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
      diagnostics: [
        {
          severity: "error",
          code: "invalid-type-name",
          message:
            'The rendered type name ""user-profile"" is not a valid TypeScript identifier.',
          path: ["document"],
          nodeKind: "document",
          source: "generator-typescript",
          evidence: {
            renderedName: '"user-profile"',
            sourceName: "user-profile",
          },
        },
      ],
    });
  });

  it("supports hand-authored reusable definitions through the full generation layer", () => {
    const document = schemaDocument(
      "user-directory",
      schemaArrayNode(schemaReferenceNode("user-profile")),
      {
        definitions: [
          schemaDefinition(
            "user-profile",
            schemaObjectNode([
              schemaFieldNode("id", schemaScalarNode("integer")),
              schemaFieldNode("display-name", schemaScalarNode("string")),
            ]),
          ),
        ],
      },
    );

    expect(typeScriptGenerator.generate(document)).toEqual({
      ok: true,
      output: [
        "export interface UserProfile {",
        "  id: number;",
        "  displayName: string;",
        "}",
        "",
        "export type UserDirectory = UserProfile[];",
      ].join("\n"),
    });
  });
});
