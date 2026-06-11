import { describe, expect, it } from "vitest";
import {
  createNamingStrategy,
  arrayType,
  fieldNode,
  identifierName,
  objectType,
  scalarType,
  schemaDocument,
  unknownType,
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
      objectType([
        fieldNode("id", scalarType("integer")),
        fieldNode("name", scalarType("string"), {
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
      objectType([
        fieldNode("id", scalarType("integer")),
        fieldNode("name", scalarType("string"), {
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
      objectType([
        fieldNode(
          "user",
          objectType([
            fieldNode("id", scalarType("integer")),
            fieldNode("active", scalarType("boolean")),
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
      generateTypeScript(schemaDocument("ScalarString", scalarType("string"))),
    ).toBe("export type ScalarString = string;");

    expect(
      generateTypeScript(
        schemaDocument(
          "UserList",
          arrayType(objectType([fieldNode("id", scalarType("integer"))])),
        ),
      ),
    ).toBe(
      ["export type UserList = Array<{", "  id: number;", "}>;"].join("\n"),
    );
  });

  it('uses smart arrayStyle by default', () => {
    expect(
      generateTypeScript(
        schemaDocument("NumberList", arrayType(scalarType("number"))),
      ),
    ).toBe("export type NumberList = number[];");

    expect(
      generateTypeScript(
        schemaDocument(
          "UnionList",
          arrayType(
            unknownType({
              reason: "top-level-null",
              nullable: true,
            }),
          ),
        ),
      ),
    ).toBe("export type UnionList = Array<unknown | null>;");
  });

  it('supports arrayStyle: "generic" and "compact"', () => {
    expect(
      generateTypeScript(
        schemaDocument("NumberList", arrayType(scalarType("number"))),
        {
          arrayStyle: "generic",
        },
      ),
    ).toBe("export type NumberList = Array<number>;");

    expect(
      generateTypeScript(
        schemaDocument(
          "UserList",
          arrayType(objectType([fieldNode("id", scalarType("integer"))])),
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
      objectType([
        fieldNode(
          "users",
          arrayType(objectType([fieldNode("id", scalarType("integer"))])),
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
      objectType([
        fieldNode(
          "tags",
          arrayType(
            objectType([fieldNode("label", scalarType("string"))]),
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
      objectType([
        fieldNode(
          {
            source: "first-name",
            words: ["first", "name"],
          },
          scalarType("string"),
        ),
        fieldNode(
          identifierName({
            source: "user_id",
            words: ["user", "id"],
          }),
          scalarType("integer"),
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
      objectType([fieldNode("user_id", scalarType("integer"))]),
    );

    expect(typeScriptGenerator.generate(doc)).toEqual({
      ok: true,
      output: ["export interface UserProfile {", "  userId: number;", "}"].join(
        "\n",
      ),
    });

    expect(
      tryGenerateTypeScript(
        schemaDocument("NumberList", arrayType(scalarType("number"))),
      ),
    ).toEqual({
      ok: true,
      output: "export type NumberList = number[];",
    });
  });

  it("normalizes invalid and reserved field identifiers", () => {
    const doc = schemaDocument(
      "TypeShape",
      objectType([
        fieldNode(
          {
            source: "123-name",
            words: ["123", "name"],
          },
          scalarType("string"),
        ),
        fieldNode(
          {
            source: "type",
            words: ["type"],
          },
          scalarType("string"),
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
          unknownType({
            reason: "top-level-null",
            nullable: true,
          }),
        ),
      ),
    ).toBe("export type StandaloneNull = unknown | null;");

    expect(
      generateTypeScript(
        schemaDocument(
          "EmptyArray",
          arrayType(
            unknownType({
              reason: "empty-array-element",
            }),
          ),
        ),
      ),
    ).toBe("export type EmptyArray = unknown[];");
  });

  it("returns structured failures for invalid rendered type names", () => {
    const doc = schemaDocument(
      "UserProfile",
      objectType([fieldNode("userId", scalarType("integer"))]),
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
      objectType([fieldNode("userId", scalarType("integer"))]),
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
      objectType([fieldNode("userId", scalarType("integer"))]),
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
      objectType([fieldNode("userId", scalarType("integer"))]),
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
      objectType([fieldNode("userId", scalarType("integer"))]),
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
      arrayType(objectType([fieldNode("id", scalarType("integer"))])),
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
