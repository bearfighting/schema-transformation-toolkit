import { describe, expect, it } from "vitest";
import { typeScriptParser } from "../../../packages/parsers/typescript/src/index.js";

describe("parser-typescript failure matrix", () => {
  describe("entry contract failures", () => {
    it("requires an explicit entry declaration name in v0", () => {
      expect(typeScriptParser.parse("type User = { id: number }")).toEqual({
        ok: false,
        code: "missing-typescript-entry",
        message:
          "TypeScript parser v0 requires an explicit entry declaration name.",
        diagnostics: [
          {
            severity: "error",
            code: "missing-typescript-entry",
            message:
              "TypeScript parser v0 requires an explicit entry declaration name.",
            path: ["entry"],
            source: "parser-typescript",
            evidence: {
              sourceLocation: {
                start: { offset: 0, line: 1, column: 1 },
                end: { offset: 26, line: 1, column: 27 },
                length: 26,
              },
            },
          },
        ],
      });
    });

    it("reports a missing entry declaration explicitly", () => {
      expect(
        typeScriptParser.parse("type User = { id: number }", {
          entry: "Account",
        }),
      ).toEqual({
        ok: false,
        code: "missing-typescript-entry-declaration",
        message:
          'The TypeScript parser could not find a supported declaration named "Account".',
        diagnostics: [
          {
            severity: "error",
            code: "missing-typescript-entry-declaration",
            message:
              'The TypeScript parser could not find a supported declaration named "Account".',
            path: ["entry", "Account"],
            source: "parser-typescript",
            evidence: expect.objectContaining({
              entry: "Account",
              availableDeclarations: ["User"],
              sourceLocation: {
                start: { offset: 0, line: 1, column: 1 },
                end: { offset: 26, line: 1, column: 27 },
                length: 26,
              },
            }),
          },
        ],
      });
    });
  });

  describe("unsupported definition syntax", () => {
    it("fails explicitly for unsupported enum member initializers", () => {
      expect(
        typeScriptParser.parse(
          'enum Status { Open = "open", Closed = OPEN_STATUS }',
          {
            entry: "Status",
          },
        ),
      ).toEqual({
        ok: false,
        code: "unsupported-typescript-enum-member-initializer",
        message:
          "Enum member initializers must be string, number, implicit numeric values, or references to earlier enum members in the supported TypeScript schema subset.",
        diagnostics: [
          {
            severity: "error",
            code: "unsupported-typescript-enum-member-initializer",
            message:
              "Enum member initializers must be string, number, implicit numeric values, or references to earlier enum members in the supported TypeScript schema subset.",
            path: ["definitions", "Status"],
            nodeKind: "definition",
            source: "parser-typescript",
            evidence: expect.objectContaining({
              documentName: "TypeScriptDocument",
              enumMember: "Closed",
              detail:
                "Unsupported TypeScript enum member initializer: OPEN_STATUS.",
              sourceLocation: {
                start: { offset: 38, line: 1, column: 39 },
                end: { offset: 49, line: 1, column: 50 },
                length: 11,
              },
            }),
          },
        ],
      });
    });

    it("fails explicitly for implicit enum values after non-numeric members", () => {
      expect(
        typeScriptParser.parse('enum Status { Open = "open", Closed }', {
          entry: "Status",
        }),
      ).toEqual({
        ok: false,
        code: "unsupported-typescript-enum-member-initializer",
        message:
          "Implicit enum member values are only supported at the start of an enum or after numeric-valued members.",
        diagnostics: [
          {
            severity: "error",
            code: "unsupported-typescript-enum-member-initializer",
            message:
              "Implicit enum member values are only supported at the start of an enum or after numeric-valued members.",
            path: ["definitions", "Status"],
            nodeKind: "definition",
            source: "parser-typescript",
            evidence: expect.objectContaining({
              documentName: "TypeScriptDocument",
              enumMember: "Closed",
              detail: "Unsupported TypeScript enum member initializer: Closed.",
              sourceLocation: {
                start: { offset: 29, line: 1, column: 30 },
                end: { offset: 35, line: 1, column: 36 },
                length: 6,
              },
            }),
          },
        ],
      });
    });

    it("fails explicitly for intersection types", () => {
      expect(
        typeScriptParser.parse("type User = Base & { id: number }", {
          entry: "User",
        }),
      ).toEqual({
        ok: false,
        code: "unsupported-typescript-intersection-type",
        message:
          "Intersection types are outside the supported TypeScript schema subset in v0.",
        diagnostics: [
          {
            severity: "error",
            code: "unsupported-typescript-intersection-type",
            message:
              "Intersection types are outside the supported TypeScript schema subset in v0.",
            path: ["definitions", "User"],
            nodeKind: "definition",
            source: "parser-typescript",
            evidence: expect.objectContaining({
              documentName: "TypeScriptDocument",
              detail: "Unsupported TypeScript syntax kind: IntersectionType.",
              sourceLocation: {
                start: { offset: 12, line: 1, column: 13 },
                end: { offset: 33, line: 1, column: 34 },
                length: 21,
              },
            }),
          },
        ],
      });
    });

    it("fails explicitly for conditional types", () => {
      expect(
        typeScriptParser.parse(
          "type Value<T> = T extends string ? string : number",
          {
            entry: "Value",
          },
        ),
      ).toEqual({
        ok: false,
        code: "unsupported-typescript-conditional-type",
        message:
          "Conditional types are outside the supported TypeScript schema subset.",
        diagnostics: [
          {
            severity: "error",
            code: "unsupported-typescript-conditional-type",
            message:
              "Conditional types are outside the supported TypeScript schema subset.",
            path: ["definitions", "Value"],
            nodeKind: "definition",
            source: "parser-typescript",
            evidence: expect.objectContaining({
              documentName: "TypeScriptDocument",
              detail: "Unsupported TypeScript syntax kind: ConditionalType.",
              sourceLocation: {
                start: { offset: 16, line: 1, column: 17 },
                end: { offset: 50, line: 1, column: 51 },
                length: 34,
              },
            }),
          },
        ],
      });
    });

    it("fails explicitly for mapped types", () => {
      expect(
        typeScriptParser.parse("type Box<T> = { [K in keyof T]: T[K] }", {
          entry: "Box",
        }),
      ).toEqual({
        ok: false,
        code: "unsupported-typescript-mapped-type",
        message:
          "Mapped types are outside the supported TypeScript schema subset.",
        diagnostics: [
          {
            severity: "error",
            code: "unsupported-typescript-mapped-type",
            message:
              "Mapped types are outside the supported TypeScript schema subset.",
            path: ["definitions", "Box"],
            nodeKind: "definition",
            source: "parser-typescript",
            evidence: expect.objectContaining({
              documentName: "TypeScriptDocument",
              detail: "Unsupported TypeScript syntax kind: MappedType.",
            }),
          },
        ],
      });
    });

    it("fails explicitly for function types", () => {
      expect(
        typeScriptParser.parse("type Handler = (value: string) => void", {
          entry: "Handler",
        }),
      ).toEqual({
        ok: false,
        code: "unsupported-typescript-function-type",
        message:
          "Function types are outside the supported TypeScript schema subset.",
        diagnostics: [
          {
            severity: "error",
            code: "unsupported-typescript-function-type",
            message:
              "Function types are outside the supported TypeScript schema subset.",
            path: ["definitions", "Handler"],
            nodeKind: "definition",
            source: "parser-typescript",
            evidence: expect.objectContaining({
              documentName: "TypeScriptDocument",
              detail: "Unsupported TypeScript syntax kind: FunctionType.",
            }),
          },
        ],
      });
    });

    it("fails explicitly for generic unsupported syntax kinds", () => {
      expect(
        typeScriptParser.parse("type Token = symbol", {
          entry: "Token",
        }),
      ).toEqual({
        ok: false,
        code: "unsupported-typescript-syntax",
        message:
          'Unsupported TypeScript syntax kind "SymbolKeyword" in the current schema subset.',
        diagnostics: [
          {
            severity: "error",
            code: "unsupported-typescript-syntax",
            message:
              'Unsupported TypeScript syntax kind "SymbolKeyword" in the current schema subset.',
            path: ["definitions", "Token"],
            nodeKind: "definition",
            source: "parser-typescript",
            evidence: expect.objectContaining({
              documentName: "TypeScriptDocument",
              detail: "Unsupported TypeScript syntax kind: SymbolKeyword.",
            }),
          },
        ],
      });
    });
  });

  describe("type member and field failures", () => {
    it("fails explicitly for unsupported object type members", () => {
      expect(
        typeScriptParser.parse(
          "type User = { format(value: string): string }",
          {
            entry: "User",
          },
        ),
      ).toEqual({
        ok: false,
        code: "unsupported-typescript-type-member",
        message:
          'Unsupported TypeScript type member kind "MethodSignature" in object type literals.',
        diagnostics: [
          {
            severity: "error",
            code: "unsupported-typescript-type-member",
            message:
              'Unsupported TypeScript type member kind "MethodSignature" in object type literals.',
            path: ["definitions", "User"],
            nodeKind: "type-member",
            source: "parser-typescript",
            evidence: expect.objectContaining({
              documentName: "TypeScriptDocument",
              detail:
                "Unsupported TypeScript type member kind: MethodSignature.",
              sourceLocation: {
                start: { offset: 14, line: 1, column: 15 },
                end: { offset: 43, line: 1, column: 44 },
                length: 29,
              },
            }),
          },
        ],
      });
    });

    it("fails explicitly for computed property names", () => {
      expect(
        typeScriptParser.parse("type User = { [name]: string }", {
          entry: "User",
        }),
      ).toEqual({
        ok: false,
        code: "unsupported-typescript-property-name",
        message:
          "Computed or otherwise non-standard property names are outside the supported TypeScript schema subset.",
        diagnostics: [
          {
            severity: "error",
            code: "unsupported-typescript-property-name",
            message:
              "Computed or otherwise non-standard property names are outside the supported TypeScript schema subset.",
            path: ["definitions", "User"],
            nodeKind: "property-name",
            source: "parser-typescript",
            evidence: expect.objectContaining({
              detail:
                "Unsupported TypeScript property name kind: ComputedPropertyName.",
              sourceLocation: {
                start: { offset: 14, line: 1, column: 15 },
                end: { offset: 20, line: 1, column: 21 },
                length: 6,
              },
            }),
          },
        ],
      });
    });

    it("fails explicitly for missing property type annotations", () => {
      expect(
        typeScriptParser.parse("type User = { name }", {
          entry: "User",
        }),
      ).toEqual({
        ok: false,
        code: "missing-typescript-property-type",
        message:
          "Property signatures without explicit type annotations are not supported.",
        diagnostics: [
          {
            severity: "error",
            code: "missing-typescript-property-type",
            message:
              "Property signatures without explicit type annotations are not supported.",
            path: ["definitions", "User"],
            nodeKind: "field",
            source: "parser-typescript",
            evidence: expect.objectContaining({
              documentName: "TypeScriptDocument",
              detail:
                "Property signatures without explicit type annotations are not supported.",
              sourceLocation: {
                start: { offset: 14, line: 1, column: 15 },
                end: { offset: 18, line: 1, column: 19 },
                length: 4,
              },
            }),
          },
        ],
      });
    });

    it("keeps nested failure diagnostics on the field path for unsupported field syntax", () => {
      expect(
        typeScriptParser.parse("type User = { token: symbol }", {
          entry: "User",
        }),
      ).toEqual({
        ok: false,
        code: "unsupported-typescript-syntax",
        message:
          'Unsupported TypeScript syntax kind "SymbolKeyword" in the current schema subset.',
        diagnostics: [
          {
            severity: "error",
            code: "unsupported-typescript-syntax",
            message:
              'Unsupported TypeScript syntax kind "SymbolKeyword" in the current schema subset.',
            path: ["definitions", "User", "token"],
            nodeKind: "field",
            source: "parser-typescript",
            evidence: expect.objectContaining({
              documentName: "TypeScriptDocument",
              detail: "Unsupported TypeScript syntax kind: SymbolKeyword.",
              sourceLocation: {
                start: { offset: 21, line: 1, column: 22 },
                end: { offset: 27, line: 1, column: 28 },
                length: 6,
              },
            }),
          },
        ],
      });
    });
  });

  describe("type reference failures", () => {
    it("fails explicitly for malformed readonly array type references", () => {
      expect(
        typeScriptParser.parse("type Values = ReadonlyArray", {
          entry: "Values",
        }),
      ).toEqual({
        ok: false,
        code: "unsupported-typescript-type-reference",
        message: "ReadonlyArray<T> requires exactly one type argument.",
        diagnostics: [
          {
            severity: "error",
            code: "unsupported-typescript-type-reference",
            message: "ReadonlyArray<T> requires exactly one type argument.",
            path: ["definitions", "Values"],
            nodeKind: "type-reference",
            source: "parser-typescript",
            evidence: expect.objectContaining({
              documentName: "TypeScriptDocument",
              detail: "ReadonlyArray<T> requires one type argument.",
              typeReference: "ReadonlyArray",
              sourceLocation: {
                start: { offset: 14, line: 1, column: 15 },
                end: { offset: 27, line: 1, column: 28 },
                length: 13,
              },
            }),
          },
        ],
      });
    });

    it("fails explicitly for non-string record keys in v0", () => {
      expect(
        typeScriptParser.parse("type Scores = Record<number, string>", {
          entry: "Scores",
        }),
      ).toEqual({
        ok: false,
        code: "unsupported-typescript-record-key",
        message:
          "Record utility types currently require a string key type in the shared schema IR.",
        diagnostics: [
          {
            severity: "error",
            code: "unsupported-typescript-record-key",
            message:
              "Record utility types currently require a string key type in the shared schema IR.",
            path: ["definitions", "Scores"],
            nodeKind: "record",
            source: "parser-typescript",
            evidence: expect.objectContaining({
              documentName: "TypeScriptDocument",
              detail: "Unsupported Record key type in: Record<number, string>.",
              typeReference: "Record<number, string>",
            }),
          },
        ],
      });
    });

    it("fails explicitly for unsupported external type references", () => {
      expect(
        typeScriptParser.parse("type User = ExternalUser", {
          entry: "User",
        }),
      ).toEqual({
        ok: false,
        code: "unsupported-typescript-type-reference",
        message:
          'Unsupported TypeScript type reference "ExternalUser" in the current schema subset.',
        diagnostics: [
          {
            severity: "error",
            code: "unsupported-typescript-type-reference",
            message:
              'Unsupported TypeScript type reference "ExternalUser" in the current schema subset.',
            path: ["definitions", "User"],
            nodeKind: "type-reference",
            source: "parser-typescript",
            evidence: expect.objectContaining({
              documentName: "TypeScriptDocument",
              detail: "Unsupported TypeScript type reference: ExternalUser.",
              typeReference: "ExternalUser",
              sourceLocation: {
                start: { offset: 12, line: 1, column: 13 },
                end: { offset: 24, line: 1, column: 25 },
                length: 12,
              },
            }),
          },
        ],
      });
    });

    it("fails explicitly for utility types outside Record", () => {
      expect(
        typeScriptParser.parse('type UserPreview = Pick<User, "id">', {
          entry: "UserPreview",
        }),
      ).toEqual({
        ok: false,
        code: "unsupported-typescript-type-reference",
        message:
          'Unsupported TypeScript type reference "Pick<User, "id">" in the current schema subset.',
        diagnostics: [
          {
            severity: "error",
            code: "unsupported-typescript-type-reference",
            message:
              'Unsupported TypeScript type reference "Pick<User, "id">" in the current schema subset.',
            path: ["definitions", "UserPreview"],
            nodeKind: "type-reference",
            source: "parser-typescript",
            evidence: expect.objectContaining({
              documentName: "TypeScriptDocument",
              detail:
                'Unsupported TypeScript type reference: Pick<User, "id">.',
              typeReference: 'Pick<User, "id">',
            }),
          },
        ],
      });
    });

    it("fails explicitly for malformed built-in type references", () => {
      expect(
        typeScriptParser.parse("type Values = Array", {
          entry: "Values",
        }),
      ).toEqual({
        ok: false,
        code: "unsupported-typescript-type-reference",
        message: "Array<T> requires exactly one type argument.",
        diagnostics: [
          {
            severity: "error",
            code: "unsupported-typescript-type-reference",
            message: "Array<T> requires exactly one type argument.",
            path: ["definitions", "Values"],
            nodeKind: "type-reference",
            source: "parser-typescript",
            evidence: expect.objectContaining({
              documentName: "TypeScriptDocument",
              detail: "Array<T> requires one type argument.",
              typeReference: "Array",
              sourceLocation: {
                start: { offset: 14, line: 1, column: 15 },
                end: { offset: 19, line: 1, column: 20 },
                length: 5,
              },
            }),
          },
        ],
      });
    });
  });

  describe("tuple failures", () => {
    it("fails explicitly for readonly tuple rest elements", () => {
      expect(
        typeScriptParser.parse("type Pair = readonly [number, ...string[]]", {
          entry: "Pair",
        }),
      ).toEqual({
        ok: false,
        code: "unsupported-typescript-tuple-rest-element",
        message:
          "Tuple rest elements are not implemented in the TypeScript parser v0 subset.",
        diagnostics: [
          {
            severity: "error",
            code: "unsupported-typescript-tuple-rest-element",
            message:
              "Tuple rest elements are not implemented in the TypeScript parser v0 subset.",
            path: ["definitions", "Pair", "elements", "1"],
            nodeKind: "tuple",
            source: "parser-typescript",
            evidence: expect.objectContaining({
              documentName: "TypeScriptDocument",
              detail: "Tuple rest elements are not implemented yet.",
              sourceLocation: {
                start: { offset: 30, line: 1, column: 31 },
                end: { offset: 41, line: 1, column: 42 },
                length: 11,
              },
            }),
          },
        ],
      });
    });

    it("fails explicitly for tuple rest elements", () => {
      expect(
        typeScriptParser.parse("type Pair = [number, ...string[]]", {
          entry: "Pair",
        }),
      ).toEqual({
        ok: false,
        code: "unsupported-typescript-tuple-rest-element",
        message:
          "Tuple rest elements are not implemented in the TypeScript parser v0 subset.",
        diagnostics: [
          {
            severity: "error",
            code: "unsupported-typescript-tuple-rest-element",
            message:
              "Tuple rest elements are not implemented in the TypeScript parser v0 subset.",
            path: ["definitions", "Pair", "elements", "1"],
            nodeKind: "tuple",
            source: "parser-typescript",
            evidence: expect.objectContaining({
              documentName: "TypeScriptDocument",
              detail: "Tuple rest elements are not implemented yet.",
              sourceLocation: {
                start: { offset: 21, line: 1, column: 22 },
                end: { offset: 32, line: 1, column: 33 },
                length: 11,
              },
            }),
          },
        ],
      });
    });
  });
});
