import { describe, expect, it } from "vitest";
import {
  createNamingStrategy,
  schemaArrayNode,
  schemaFieldNode,
  identifierName,
  schemaLiteralNode,
  schemaNullNode,
  schemaObjectNode,
  schemaRecordNode,
  schemaScalarNode,
  schemaDocument,
  schemaTupleElement,
  schemaTupleNode,
  schemaUnionNode,
  schemaUnknownNode,
} from "../../../packages/core/src/index.js";
import { generateTypeScript } from "../../../packages/generators/typescript/src/index.js";
import {
  DEFAULT_TYPESCRIPT_GENERATOR_OPTIONS,
  configureTypeScriptGenerator,
  createTypeScriptGenerator,
  prepareTypeScriptGeneratorOptions,
  preparedTypeScriptGeneratorOptions,
  resolveTypeScriptGeneratorOptions,
  tryGenerateTypeScript,
  typeScriptGenerator,
} from "../../../packages/generators/typescript/src/index.js";
import { inferJsonDocument } from "../../../packages/parsers/json/src/index.js";

describe("generator-typescript", () => {
  it("generates a root interface for object documents", () => {
    const doc = schemaDocument(
      "User",
      schemaObjectNode([
        schemaFieldNode("id", schemaScalarNode("integer")),
        schemaFieldNode("name", schemaScalarNode("string"), {
          required: false,
          nullable: true,
        }),
      ]),
    );

    expect(generateTypeScript(doc)).toBe(
      [
        "export interface User {",
        "  id: number;",
        "  name?: string | null;",
        "}",
      ].join("\n"),
    );
  });

  it('supports rootObjectMode: "type" for object documents', () => {
    const doc = schemaDocument(
      "User",
      schemaObjectNode([
        schemaFieldNode("id", schemaScalarNode("integer")),
        schemaFieldNode("name", schemaScalarNode("string"), {
          required: false,
          nullable: true,
        }),
      ]),
    );

    expect(
      generateTypeScript(doc, {
        rootObjectMode: "type",
      }),
    ).toBe(
      [
        "export type User = {",
        "  id: number;",
        "  name?: string | null;",
        "};",
      ].join("\n"),
    );
  });

  it("generates nested inline object types", () => {
    const doc = schemaDocument(
      "NestedUser",
      schemaObjectNode([
        schemaFieldNode(
          "user",
          schemaObjectNode([
            schemaFieldNode("id", schemaScalarNode("integer")),
            schemaFieldNode("active", schemaScalarNode("boolean")),
          ]),
        ),
      ]),
    );

    expect(generateTypeScript(doc)).toBe(
      [
        "export interface NestedUser {",
        "  user: {",
        "    id: number;",
        "    active: boolean;",
        "  };",
        "}",
      ].join("\n"),
    );
  });

  it("generates type aliases for scalar and array roots", () => {
    expect(
      generateTypeScript(schemaDocument("ScalarString", schemaScalarNode("string"))),
    ).toBe("export type ScalarString = string;");

    expect(
      generateTypeScript(
        schemaDocument(
          "UserList",
          schemaArrayNode(schemaObjectNode([schemaFieldNode("id", schemaScalarNode("integer"))])),
        ),
      ),
    ).toBe(
      ["export type UserList = Array<{", "  id: number;", "}>;"].join("\n"),
    );
  });

  it('uses smart arrayStyle by default', () => {
    expect(
      generateTypeScript(
        schemaDocument("NumberList", schemaArrayNode(schemaScalarNode("number"))),
      ),
    ).toBe("export type NumberList = number[];");

    expect(
      generateTypeScript(
        schemaDocument(
          "UnionList",
          schemaArrayNode(
            schemaNullNode(),
          ),
        ),
      ),
    ).toBe("export type UnionList = null[];");
  });

  it('supports arrayStyle: "generic" and "compact"', () => {
    expect(
      generateTypeScript(
        schemaDocument("NumberList", schemaArrayNode(schemaScalarNode("number"))),
        {
          arrayStyle: "generic",
        },
      ),
    ).toBe("export type NumberList = Array<number>;");

    expect(
      generateTypeScript(
        schemaDocument(
          "UserList",
          schemaArrayNode(schemaObjectNode([schemaFieldNode("id", schemaScalarNode("integer"))])),
        ),
        {
          arrayStyle: "compact",
        },
      ),
    ).toBe(["export type UserList = ({", "  id: number;", "})[];"].join("\n"));
  });

  it("applies smart arrayStyle to nested object-array fields", () => {
    const doc = schemaDocument(
      "UserDirectory",
      schemaObjectNode([
        schemaFieldNode(
          "users",
          schemaArrayNode(schemaObjectNode([schemaFieldNode("id", schemaScalarNode("integer"))])),
        ),
      ]),
    );

    expect(generateTypeScript(doc)).toBe(
      [
        "export interface UserDirectory {",
        "  users: Array<{",
        "    id: number;",
        "  }>;",
        "}",
      ].join("\n"),
    );
  });

  it("wraps nullable array field types correctly", () => {
    const doc = schemaDocument(
      "UserShape",
      schemaObjectNode([
        schemaFieldNode(
          "tags",
          schemaArrayNode(
            schemaObjectNode([schemaFieldNode("label", schemaScalarNode("string"))]),
          ),
          {
            nullable: true,
          },
        ),
      ]),
    );

    expect(generateTypeScript(doc)).toBe(
      [
        "export interface UserShape {",
        "  tags: Array<{",
        "    label: string;",
        "  }> | null;",
        "}",
      ].join("\n"),
    );

    expect(
      generateTypeScript(doc, {
        arrayStyle: "compact",
      }),
    ).toBe(
      [
        "export interface UserShape {",
        "  tags: ({",
        "    label: string;",
        "  })[] | null;",
        "}",
      ].join("\n"),
    );
  });

  it("supports the json -> ast -> typescript chain", () => {
    const doc = inferJsonDocument(
      '[{"id":1,"name":"Ada"},{"id":2}]',
      "UserList",
    );

    expect(generateTypeScript(doc)).toBe(
      [
        "export type UserList = Array<{",
        "  id: number;",
        "  name?: string;",
        "}>;",
      ].join("\n"),
    );
  });

  it("renders names from normalized words", () => {
    const doc = schemaDocument(
      {
        source: "user-profile",
        words: ["user", "profile"],
      },
      schemaObjectNode([
        schemaFieldNode(
          {
            source: "first-name",
            words: ["first", "name"],
          },
          schemaScalarNode("string"),
        ),
        schemaFieldNode(
          identifierName({
            source: "user_id",
            words: ["user", "id"],
          }),
          schemaScalarNode("integer"),
        ),
      ]),
    );

    expect(generateTypeScript(doc)).toBe(
      [
        "export interface UserProfile {",
        "  firstName: string;",
        "  userId: number;",
        "}",
      ].join("\n"),
    );
  });

  it("implements the shared generator interface", () => {
    const doc = schemaDocument(
      "UserProfile",
      schemaObjectNode([schemaFieldNode("user_id", schemaScalarNode("integer"))]),
    );

    expect(typeScriptGenerator.generate(doc)).toEqual({
      ok: true,
      output: ["export interface UserProfile {", "  userId: number;", "}"].join(
        "\n",
      ),
    });

    expect(
      tryGenerateTypeScript(
        schemaDocument("NumberList", schemaArrayNode(schemaScalarNode("number"))),
      ),
    ).toEqual({
      ok: true,
      output: "export type NumberList = number[];",
    });
  });

  it("normalizes invalid and reserved field identifiers", () => {
    const doc = schemaDocument(
      "TypeShape",
      schemaObjectNode([
        schemaFieldNode(
          {
            source: "123-name",
            words: ["123", "name"],
          },
          schemaScalarNode("string"),
        ),
        schemaFieldNode(
          {
            source: "type",
            words: ["type"],
          },
          schemaScalarNode("string"),
        ),
      ]),
    );

    expect(generateTypeScript(doc)).toBe(
      [
        "export interface TypeShape {",
        "  _123Name: string;",
        "  type_: string;",
        "}",
      ].join("\n"),
    );
  });

  it("renders unresolved unknown semantics in TypeScript output", () => {
    expect(
      generateTypeScript(
        schemaDocument(
          "StandaloneNull",
          schemaNullNode(),
        ),
      ),
    ).toBe("export type StandaloneNull = null;");

    expect(
      generateTypeScript(
        schemaDocument(
          "EmptyArray",
          schemaArrayNode(
            schemaUnknownNode({
              reason: "empty-array-element",
            }),
          ),
        ),
      ),
    ).toBe("export type EmptyArray = unknown[];");
  });

  it("renders literal nodes in TypeScript output", () => {
    expect(
      generateTypeScript(schemaDocument("LiteralStatus", schemaLiteralNode("open"))),
    ).toBe('export type LiteralStatus = "open";');

    expect(
      generateTypeScript(
        schemaDocument(
          "LiteralShape",
          schemaObjectNode([
            schemaFieldNode("enabled", schemaLiteralNode(true)),
            schemaFieldNode("count", schemaLiteralNode(42)),
          ]),
        ),
      ),
    ).toBe(
      [
        "export interface LiteralShape {",
        "  enabled: true;",
        "  count: 42;",
        "}",
      ].join("\n"),
    );
  });

  it("renders nullable literal field types distinctly", () => {
    const doc = schemaDocument(
      "LiteralNullableShape",
      schemaObjectNode([
        schemaFieldNode("status", schemaLiteralNode("open"), {
          nullable: true,
        }),
      ]),
    );

    expect(generateTypeScript(doc)).toBe(
      [
        "export interface LiteralNullableShape {",
        '  status: "open" | null;',
        "}",
      ].join("\n"),
    );
  });

  it("renders union nodes in TypeScript output", () => {
    expect(
      generateTypeScript(
        schemaDocument(
          "MixedValue",
          schemaUnionNode([schemaScalarNode("string"), schemaScalarNode("integer")]),
        ),
      ),
    ).toBe("export type MixedValue = string | number;");

    expect(
      generateTypeScript(
        schemaDocument(
          "UnionList",
          schemaArrayNode(
            schemaUnionNode([schemaLiteralNode("open"), schemaNullNode()]),
          ),
        ),
      ),
    ).toBe('export type UnionList = Array<"open" | null>;');
  });

  it("renders tuple nodes in TypeScript output", () => {
    expect(
      generateTypeScript(
        schemaDocument(
          "CoordinatePair",
          schemaTupleNode([schemaScalarNode("integer"), schemaLiteralNode("north")]),
        ),
      ),
    ).toBe('export type CoordinatePair = [number, "north"];');

    expect(
      generateTypeScript(
        schemaDocument(
          "TupleFieldShape",
          schemaObjectNode([
            schemaFieldNode(
              "pair",
              schemaTupleNode([schemaScalarNode("integer"), schemaScalarNode("string")]),
            ),
          ]),
        ),
      ),
    ).toBe(
      [
        "export interface TupleFieldShape {",
        "  pair: [number, string];",
        "}",
      ].join("\n"),
    );

    expect(
      generateTypeScript(
        schemaDocument(
          "PartialTuple",
          schemaTupleNode([
            schemaScalarNode("integer"),
            schemaTupleElement(schemaScalarNode("string"), {
              required: false,
            }),
          ]),
        ),
      ),
    ).toBe("export type PartialTuple = [number, string?];");

    expect(
      generateTypeScript(
        schemaDocument(
          "NullableOptionalTuple",
          schemaTupleNode([
            schemaScalarNode("integer"),
            schemaTupleElement(
              schemaUnionNode([schemaScalarNode("string"), schemaNullNode()]),
              {
                required: false,
              },
            ),
          ]),
        ),
      ),
    ).toBe("export type NullableOptionalTuple = [number, (string | null)?];");
  });

  it("renders record nodes in TypeScript output", () => {
    expect(
      generateTypeScript(
        schemaDocument(
          "Translations",
          schemaRecordNode(
            schemaScalarNode("string"),
            schemaScalarNode("string"),
          ),
        ),
      ),
    ).toBe("export type Translations = Record<string, string>;");

    expect(
      generateTypeScript(
        schemaDocument(
          "Catalog",
          schemaObjectNode([
            schemaFieldNode(
              "items",
              schemaRecordNode(
                schemaScalarNode("string"),
                schemaObjectNode([
                  schemaFieldNode("price", schemaScalarNode("number")),
                ]),
              ),
            ),
          ]),
        ),
      ),
    ).toBe(
      [
        "export interface Catalog {",
        "  items: Record<string, {",
        "    price: number;",
        "  }>;",
        "}",
      ].join("\n"),
    );
  });

  it("wraps nullable union field types correctly", () => {
    const doc = schemaDocument(
      "NullableUnionShape",
      schemaObjectNode([
        schemaFieldNode(
          "value",
          schemaUnionNode([schemaScalarNode("string"), schemaScalarNode("integer")]),
          {
            nullable: true,
          },
        ),
      ]),
    );

    expect(generateTypeScript(doc)).toBe(
      [
        "export interface NullableUnionShape {",
        "  value: (string | number) | null;",
        "}",
      ].join("\n"),
    );
  });

  it("escapes string literal nodes safely in TypeScript output", () => {
    expect(
      generateTypeScript(
        schemaDocument(
          "EscapedLiteral",
          schemaLiteralNode('a"b\\c\nline'),
        ),
      ),
    ).toBe('export type EscapedLiteral = "a\\"b\\\\c\\nline";');
  });

  it("renders explicit null field types distinctly from nullable non-null fields", () => {
    const doc = schemaDocument(
      "NullFieldShape",
      schemaObjectNode([
        schemaFieldNode("name", schemaNullNode()),
        schemaFieldNode("nickname", schemaScalarNode("string"), {
          nullable: true,
        }),
      ]),
    );

    expect(generateTypeScript(doc)).toBe(
      [
        "export interface NullFieldShape {",
        "  name: null;",
        "  nickname: string | null;",
        "}",
      ].join("\n"),
    );
  });

  it("returns structured failures for invalid rendered type names", () => {
    const doc = schemaDocument(
      "UserProfile",
      schemaObjectNode([schemaFieldNode("userId", schemaScalarNode("integer"))]),
    );

    const generator = createTypeScriptGenerator({
      namingStrategy: {
        renderTypeName() {
          return '"user-profile"';
        },
        renderFieldName(name) {
          return name.source;
        },
      },
    });

    expect(generator.generate(doc)).toEqual({
      ok: false,
      code: "invalid-type-name",
      message:
        'The rendered type name ""user-profile"" is not a valid TypeScript identifier.',
    });
    expect(() =>
      generateTypeScript(doc, {
        namingStrategy: {
          renderTypeName() {
            return '"user-profile"';
          },
          renderFieldName(name) {
            return name.source;
          },
        },
      }),
    ).toThrow(/invalid-type-name/);
  });

  it("returns structured failures for invalid rendered field names", () => {
    const doc = schemaDocument(
      "UserProfile",
      schemaObjectNode([schemaFieldNode("userId", schemaScalarNode("integer"))]),
    );

    expect(
      tryGenerateTypeScript(doc, {
        namingStrategy: {
          renderTypeName() {
            return "UserProfile";
          },
          renderFieldName() {
            return "user-id";
          },
        },
      }),
    ).toEqual({
      ok: false,
      code: "invalid-field-name",
      message:
        'The rendered field name "user-id" for source field "userId" is not valid TypeScript property syntax.',
    });
  });

  it("creates configured generator instances", () => {
    const generator = createTypeScriptGenerator({
      rootObjectMode: "type",
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

    const doc = schemaDocument(
      "UserProfile",
      schemaObjectNode([schemaFieldNode("userId", schemaScalarNode("integer"))]),
    );

    expect(generator.generate(doc)).toEqual({
      ok: true,
      output: [
        "export type user_profile = {",
        "  user_id: number;",
        "};",
      ].join("\n"),
    });
  });

  it("lets runtime generator options override configured defaults", () => {
    const generator = createTypeScriptGenerator({
      namingStrategy: createNamingStrategy({
        typeName: {
          style: "pascal",
          invalidPrefix: "_",
          reservedWordHandling: "suffix",
          reservedWordSuffix: "_",
        },
        fieldName: {
          style: "camel",
          invalidPrefix: "_",
          reservedWordHandling: "suffix",
          reservedWordSuffix: "_",
        },
      }),
    });

    const doc = schemaDocument(
      "UserProfile",
      schemaObjectNode([schemaFieldNode("userId", schemaScalarNode("integer"))]),
    );

    expect(
      generator.generate(doc, {
        rootObjectMode: "type",
        arrayStyle: "generic",
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
      }),
    ).toEqual({
      ok: true,
      output: [
        "export type user_profile = {",
        "  user_id: number;",
        "};",
      ].join("\n"),
    });
  });

  it("lets the convenience function accept generator options", () => {
    const doc = schemaDocument(
      "UserProfile",
      schemaObjectNode([schemaFieldNode("userId", schemaScalarNode("integer"))]),
    );

    expect(
      generateTypeScript(doc, {
        rootObjectMode: "type",
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
      }),
    ).toBe(
      ["export type user_profile = {", "  user_id: number;", "};"].join("\n"),
    );
  });

  it("lets runtime arrayStyle override configured defaults", () => {
    const generator = createTypeScriptGenerator({
      arrayStyle: "compact",
    });

    const doc = schemaDocument(
      "UserList",
      schemaArrayNode(schemaObjectNode([schemaFieldNode("id", schemaScalarNode("integer"))])),
    );

    expect(generator.generate(doc)).toEqual({
      ok: true,
      output: ["export type UserList = ({", "  id: number;", "})[];"].join("\n"),
    });

    expect(
      generator.generate(doc, {
        arrayStyle: "generic",
      }),
    ).toEqual({
      ok: true,
      output: ["export type UserList = Array<{", "  id: number;", "}>;"].join("\n"),
    });
  });

  it("exposes default and resolved generator options", () => {
    const resolved = resolveTypeScriptGeneratorOptions();
    const prepared = prepareTypeScriptGeneratorOptions();

    expect(
      typeof DEFAULT_TYPESCRIPT_GENERATOR_OPTIONS.namingStrategy.renderTypeName,
    ).toBe("function");
    expect(DEFAULT_TYPESCRIPT_GENERATOR_OPTIONS.rootObjectMode).toBe("interface");
    expect(DEFAULT_TYPESCRIPT_GENERATOR_OPTIONS.arrayStyle).toBe("smart");
    expect(typeof resolved.namingStrategy.renderFieldName).toBe("function");
    expect(resolved.rootObjectMode).toBe("interface");
    expect(resolved.arrayStyle).toBe("smart");
    expect(prepared.errors).toEqual([]);
    expect(prepared.warnings).toEqual([]);
    expect(prepared.resolved).toEqual(resolved);
  });

  it("exposes configured generator instances with prepared options", () => {
    const configuredGenerator = configureTypeScriptGenerator();

    expect(configuredGenerator.prepared.errors).toEqual([]);
    expect(configuredGenerator.prepared.warnings).toEqual([]);
    expect(configuredGenerator.prepared.resolved).toEqual(
      DEFAULT_TYPESCRIPT_GENERATOR_OPTIONS,
    );
    expect(preparedTypeScriptGeneratorOptions).toEqual(
      configuredGenerator.prepared,
    );
  });
});
