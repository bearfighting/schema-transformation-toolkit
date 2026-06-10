import { describe, expect, it } from "vitest";
import {
  createNamingStrategy,
  arrayType,
  fieldNode,
  identifierName,
  objectType,
  scalarType,
  schemaDocument,
  unknownType
} from "../packages/core/src/index.js";
import { generateTypeScript } from "../packages/generator-typescript/src/index.js";
import {
  DEFAULT_TYPESCRIPT_GENERATOR_OPTIONS,
  configureTypeScriptGenerator,
  createTypeScriptGenerator,
  prepareTypeScriptGeneratorOptions,
  preparedTypeScriptGeneratorOptions,
  resolveTypeScriptGeneratorOptions,
  typeScriptGenerator
} from "../packages/generator-typescript/src/index.js";
import { inferJsonDocument } from "../packages/parser-json/src/index.js";

describe("generator-typescript", () => {
  it("generates a root interface for object documents", () => {
    const doc = schemaDocument(
      "User",
      objectType([
        fieldNode("id", scalarType("integer")),
        fieldNode("name", scalarType("string"), {
          required: false,
          nullable: true
        })
      ])
    );

    expect(generateTypeScript(doc)).toBe(
      [
        "export interface User {",
        "  id: number;",
        "  name?: string | null;",
        "}"
      ].join("\n")
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
            fieldNode("active", scalarType("boolean"))
          ])
        )
      ])
    );

    expect(generateTypeScript(doc)).toBe(
      [
        "export interface NestedUser {",
        "  user: {",
        "    id: number;",
        "    active: boolean;",
        "  };",
        "}"
      ].join("\n")
    );
  });

  it("generates type aliases for scalar and array roots", () => {
    expect(
      generateTypeScript(schemaDocument("ScalarString", scalarType("string")))
    ).toBe("export type ScalarString = string;");

    expect(
      generateTypeScript(
        schemaDocument("UserList", arrayType(objectType([fieldNode("id", scalarType("integer"))])))
      )
    ).toBe(
      [
        "export type UserList = ({",
        "  id: number;",
        "})[];"
      ].join("\n")
    );
  });

  it("supports the json -> ast -> typescript chain", () => {
    const doc = inferJsonDocument(
      '[{"id":1,"name":"Ada"},{"id":2}]',
      "UserList"
    );

    expect(generateTypeScript(doc)).toBe(
      [
        "export type UserList = ({",
        "  id: number;",
        "  name?: string;",
        "})[];"
      ].join("\n")
    );
  });

  it("renders names from normalized words", () => {
    const doc = schemaDocument(
      {
        source: "user-profile",
        words: ["user", "profile"]
      },
      objectType([
        fieldNode(
          {
            source: "first-name",
            words: ["first", "name"]
          },
          scalarType("string")
        ),
        fieldNode(
          identifierName({
            source: "user_id",
            words: ["user", "id"]
          }),
          scalarType("integer")
        )
      ])
    );

    expect(generateTypeScript(doc)).toBe(
      [
        "export interface UserProfile {",
        "  firstName: string;",
        "  userId: number;",
        "}"
      ].join("\n")
    );
  });

  it("implements the shared generator interface", () => {
    const doc = schemaDocument(
      "UserProfile",
      objectType([fieldNode("user_id", scalarType("integer"))])
    );

    expect(typeScriptGenerator.generate(doc)).toEqual({
      ok: true,
      output: [
        "export interface UserProfile {",
        "  userId: number;",
        "}"
      ].join("\n")
    });
  });

  it("normalizes invalid and reserved field identifiers", () => {
    const doc = schemaDocument(
      "TypeShape",
      objectType([
        fieldNode(
          {
            source: "123-name",
            words: ["123", "name"]
          },
          scalarType("string")
        ),
        fieldNode(
          {
            source: "type",
            words: ["type"]
          },
          scalarType("string")
        )
      ])
    );

    expect(generateTypeScript(doc)).toBe(
      [
        "export interface TypeShape {",
        "  name: string;",
        "  type_: string;",
        "}"
      ].join("\n")
    );
  });

  it("renders unresolved unknown semantics in TypeScript output", () => {
    expect(
      generateTypeScript(
        schemaDocument(
          "StandaloneNull",
          unknownType({
            reason: "top-level-null",
            nullable: true
          })
        )
      )
    ).toBe("export type StandaloneNull = unknown | null;");

    expect(
      generateTypeScript(
        schemaDocument(
          "EmptyArray",
          arrayType(
            unknownType({
              reason: "empty-array-element"
            })
          )
        )
      )
    ).toBe("export type EmptyArray = unknown[];");
  });

  it("creates configured generator instances", () => {
    const generator = createTypeScriptGenerator({
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

    const doc = schemaDocument(
      "UserProfile",
      objectType([fieldNode("userId", scalarType("integer"))])
    );

    expect(generator.generate(doc)).toEqual({
      ok: true,
      output: [
        "export interface user_profile {",
        "  user_id: number;",
        "}"
      ].join("\n")
    });
  });

  it("exposes default and resolved generator options", () => {
    const resolved = resolveTypeScriptGeneratorOptions();
    const prepared = prepareTypeScriptGeneratorOptions();

    expect(typeof DEFAULT_TYPESCRIPT_GENERATOR_OPTIONS.namingStrategy.renderTypeName).toBe(
      "function"
    );
    expect(typeof resolved.namingStrategy.renderFieldName).toBe("function");
    expect(prepared.errors).toEqual([]);
    expect(prepared.warnings).toEqual([]);
    expect(prepared.resolved).toEqual(resolved);
  });

  it("exposes configured generator instances with prepared options", () => {
    const configuredGenerator = configureTypeScriptGenerator();

    expect(configuredGenerator.prepared.errors).toEqual([]);
    expect(configuredGenerator.prepared.warnings).toEqual([]);
    expect(configuredGenerator.prepared.resolved).toEqual(
      DEFAULT_TYPESCRIPT_GENERATOR_OPTIONS
    );
    expect(preparedTypeScriptGeneratorOptions).toEqual(configuredGenerator.prepared);
  });
});
