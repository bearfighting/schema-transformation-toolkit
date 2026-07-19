import { describe, expect, it } from "vitest";
import {
  schemaArrayNode,
  schemaDefinition,
  schemaDocument,
  schemaFieldNode,
  schemaLiteralNode,
  schemaNullNode,
  schemaObjectNode,
  schemaRecordNode,
  schemaReferenceNode,
  schemaScalarNode,
  schemaTupleElement,
  schemaTupleNode,
  schemaUnionNode,
} from "../../../packages/core/src/index.js";
import {
  preparedTypeScriptParserOptions,
  tryInferTypeScriptDocumentWithOptions,
  typeScriptParser,
} from "../../../packages/parsers/typescript/src/index.js";

describe("parser-typescript success paths", () => {
  describe("entry selection", () => {
    it("infers the entry when exactly one supported top-level declaration exists", () => {
      expect(
        tryInferTypeScriptDocumentWithOptions("type User = { id: number }"),
      ).toEqual({
        ok: true,
        document: schemaDocument(
          "TypeScriptDocument",
          schemaReferenceNode("User"),
          {
            definitions: [
              schemaDefinition(
                "User",
                schemaObjectNode([
                  schemaFieldNode("id", schemaScalarNode("number")),
                ]),
              ),
            ],
          },
        ),
        semanticNotes: [
          {
            kind: "policy",
            code: "typescript-implicit-entry-selected",
            message:
              'The TypeScript parser selected entry "User" implicitly using the single supported declaration rule.',
            path: ["entry", "User"],
            nodeKind: "entry",
            source: "parser-typescript",
            layer: "shape",
            evidence: {
              entry: "User",
              selectionReason: "single-declaration",
            },
          },
        ],
      });
    });

    it("ignores side-effect imports when inferring the only supported top-level declaration", () => {
      expect(
        tryInferTypeScriptDocumentWithOptions(
          ['import "./polyfills";', "type User = { id: number }"].join("\n"),
        ),
      ).toEqual({
        ok: true,
        document: schemaDocument(
          "TypeScriptDocument",
          schemaReferenceNode("User"),
          {
            definitions: [
              schemaDefinition(
                "User",
                schemaObjectNode([
                  schemaFieldNode("id", schemaScalarNode("number")),
                ]),
              ),
            ],
          },
        ),
        semanticNotes: [
          {
            kind: "policy",
            code: "typescript-implicit-entry-selected",
            message:
              'The TypeScript parser selected entry "User" implicitly using the single supported declaration rule.',
            path: ["entry", "User"],
            nodeKind: "entry",
            source: "parser-typescript",
            layer: "shape",
            evidence: {
              entry: "User",
              selectionReason: "single-declaration",
            },
          },
        ],
      });
    });

    it("ignores empty export markers when inferring the only supported top-level declaration", () => {
      expect(
        tryInferTypeScriptDocumentWithOptions(
          ["export {};", "interface User { id: number }"].join("\n"),
        ),
      ).toEqual({
        ok: true,
        document: schemaDocument(
          "TypeScriptDocument",
          schemaReferenceNode("User"),
          {
            definitions: [
              schemaDefinition(
                "User",
                schemaObjectNode([
                  schemaFieldNode("id", schemaScalarNode("number")),
                ]),
              ),
            ],
          },
        ),
        semanticNotes: [
          {
            kind: "policy",
            code: "typescript-implicit-entry-selected",
            message:
              'The TypeScript parser selected entry "User" implicitly using the single supported declaration rule.',
            path: ["entry", "User"],
            nodeKind: "entry",
            source: "parser-typescript",
            layer: "shape",
            evidence: {
              entry: "User",
              selectionReason: "single-declaration",
            },
          },
        ],
      });
    });

    it("infers the only exported supported declaration when local helper declarations are also present", () => {
      expect(
        tryInferTypeScriptDocumentWithOptions(
          [
            "type InternalUser = { id: number };",
            "export type UserList = InternalUser[];",
          ].join("\n"),
        ),
      ).toEqual({
        ok: true,
        document: schemaDocument(
          "TypeScriptDocument",
          schemaReferenceNode("UserList"),
          {
            definitions: [
              schemaDefinition(
                "InternalUser",
                schemaObjectNode([
                  schemaFieldNode("id", schemaScalarNode("number")),
                ]),
              ),
              schemaDefinition(
                "UserList",
                schemaArrayNode(schemaReferenceNode("InternalUser")),
              ),
            ],
          },
        ),
        semanticNotes: [
          {
            kind: "policy",
            code: "typescript-implicit-entry-selected",
            message:
              'The TypeScript parser selected entry "UserList" implicitly using the single exported supported declaration rule.',
            path: ["entry", "UserList"],
            nodeKind: "entry",
            source: "parser-typescript",
            layer: "shape",
            evidence: {
              entry: "UserList",
              selectionReason: "single-exported-declaration",
            },
          },
        ],
      });
    });

    it("infers the unique declaration root when helper declarations feed one final local entry", () => {
      expect(
        tryInferTypeScriptDocumentWithOptions(
          [
            "type Identifier = number;",
            "type User = { id: Identifier };",
            "type UserList = User[];",
          ].join("\n"),
        ),
      ).toEqual({
        ok: true,
        document: schemaDocument(
          "TypeScriptDocument",
          schemaReferenceNode("UserList"),
          {
            definitions: [
              schemaDefinition("Identifier", schemaScalarNode("number")),
              schemaDefinition(
                "User",
                schemaObjectNode([
                  schemaFieldNode("id", schemaReferenceNode("Identifier")),
                ]),
              ),
              schemaDefinition(
                "UserList",
                schemaArrayNode(schemaReferenceNode("User")),
              ),
            ],
          },
        ),
        semanticNotes: [
          {
            kind: "policy",
            code: "typescript-implicit-entry-selected",
            message:
              'The TypeScript parser selected entry "UserList" implicitly using the single local root rule.',
            path: ["entry", "UserList"],
            nodeKind: "entry",
            source: "parser-typescript",
            layer: "shape",
            evidence: {
              entry: "UserList",
              selectionReason: "single-root",
            },
          },
        ],
      });
    });

    it("infers the unique exported declaration root when exported helpers feed one final exported entry", () => {
      expect(
        tryInferTypeScriptDocumentWithOptions(
          [
            "type InternalToken = string;",
            "export type User = { token: InternalToken };",
            "export type UserList = User[];",
          ].join("\n"),
        ),
      ).toEqual({
        ok: true,
        document: schemaDocument(
          "TypeScriptDocument",
          schemaReferenceNode("UserList"),
          {
            definitions: [
              schemaDefinition("InternalToken", schemaScalarNode("string")),
              schemaDefinition(
                "User",
                schemaObjectNode([
                  schemaFieldNode(
                    "token",
                    schemaReferenceNode("InternalToken"),
                  ),
                ]),
              ),
              schemaDefinition(
                "UserList",
                schemaArrayNode(schemaReferenceNode("User")),
              ),
            ],
          },
        ),
        semanticNotes: [
          {
            kind: "policy",
            code: "typescript-implicit-entry-selected",
            message:
              'The TypeScript parser selected entry "UserList" implicitly using the single exported root rule.',
            path: ["entry", "UserList"],
            nodeKind: "entry",
            source: "parser-typescript",
            layer: "shape",
            evidence: {
              entry: "UserList",
              selectionReason: "single-exported-root",
            },
          },
        ],
      });
    });

    it("still requires an explicit entry when multiple exported declaration roots remain", () => {
      expect(
        tryInferTypeScriptDocumentWithOptions(
          [
            "type InternalToken = string;",
            "export type User = { token: InternalToken };",
            "export type Account = { id: number };",
          ].join("\n"),
        ),
      ).toEqual({
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
              documentName: "TypeScriptDocument",
              availableDeclarations: ["Account", "InternalToken", "User"],
              availableExportedDeclarations: ["Account", "User"],
              rootCandidates: ["Account", "User"],
              exportedRootCandidates: ["Account", "User"],
              implicitEntryAmbiguityReason:
                "multiple-exported-root-candidates",
              sourceLocation: {
                start: { offset: 0, line: 1, column: 1 },
                end: { offset: 111, line: 3, column: 38 },
                length: 111,
              },
            },
          },
        ],
      });
    });

    it("uses the document name as a conservative tie-breaker when it matches an ambiguous root candidate", () => {
      expect(
        tryInferTypeScriptDocumentWithOptions(
          [
            "type User = { id: number };",
            "type Account = { name: string };",
          ].join("\n"),
          {
            name: "UserDocument",
          },
        ),
      ).toEqual({
        ok: true,
        document: schemaDocument(
          "UserDocument",
          schemaReferenceNode("User"),
          {
            definitions: [
              schemaDefinition(
                "User",
                schemaObjectNode([
                  schemaFieldNode("id", schemaScalarNode("number")),
                ]),
              ),
            ],
          },
        ),
        semanticNotes: [
          {
            kind: "policy",
            code: "typescript-implicit-entry-selected",
            message:
              'The TypeScript parser selected entry "User" implicitly using the document name match rule.',
            path: ["entry", "User"],
            nodeKind: "entry",
            source: "parser-typescript",
            layer: "shape",
            evidence: {
              entry: "User",
              selectionReason: "document-name-match",
            },
          },
        ],
      });
    });

    it("still requires an explicit entry when multiple independent declaration roots remain", () => {
      expect(
        tryInferTypeScriptDocumentWithOptions(
          [
            "type Identifier = number;",
            "type User = { id: Identifier };",
            "type Account = { name: string };",
          ].join("\n"),
        ),
      ).toEqual({
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
              documentName: "TypeScriptDocument",
              availableDeclarations: ["Account", "Identifier", "User"],
              availableExportedDeclarations: [],
              rootCandidates: ["Account", "User"],
              exportedRootCandidates: [],
              implicitEntryAmbiguityReason: "multiple-local-root-candidates",
              sourceLocation: {
                start: { offset: 0, line: 1, column: 1 },
                end: { offset: 90, line: 3, column: 33 },
                length: 90,
              },
            },
          },
        ],
      });
    });

    it("reports a cyclic-root ambiguity when declarations only reference each other", () => {
      expect(
        tryInferTypeScriptDocumentWithOptions(
          [
            "type A = B;",
            "type B = A;",
          ].join("\n"),
        ),
      ).toEqual({
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
              documentName: "TypeScriptDocument",
              availableDeclarations: ["A", "B"],
              availableExportedDeclarations: [],
              rootCandidates: [],
              exportedRootCandidates: [],
              implicitEntryAmbiguityReason: "cyclic-root-candidates",
              sourceLocation: {
                start: { offset: 0, line: 1, column: 1 },
                end: { offset: 23, line: 2, column: 12 },
                length: 23,
              },
            },
          },
        ],
      });
    });

    it("requires an explicit entry declaration name in v0", () => {
      expect(
        tryInferTypeScriptDocumentWithOptions(
          [
            "type User = { id: number }",
            "type Account = { name: string }",
          ].join("\n"),
        ),
      ).toEqual({
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
              documentName: "TypeScriptDocument",
              availableDeclarations: ["Account", "User"],
              availableExportedDeclarations: [],
              rootCandidates: ["Account", "User"],
              exportedRootCandidates: [],
              implicitEntryAmbiguityReason: "multiple-local-root-candidates",
              sourceLocation: {
                start: { offset: 0, line: 1, column: 1 },
                end: { offset: 58, line: 2, column: 32 },
                length: 58,
              },
            },
          },
        ],
      });
    });

    it("reports a missing entry declaration explicitly", () => {
      expect(
        tryInferTypeScriptDocumentWithOptions("type User = { id: number }", {
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
              documentName: "TypeScriptDocument",
              entry: "Account",
              requestedEntry: "Account",
              availableDeclarations: ["User"],
              availableExportedDeclarations: [],
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

    it("still requires an explicit entry when multiple supported declarations are exported", () => {
      expect(
        tryInferTypeScriptDocumentWithOptions(
          [
            "export type User = { id: number };",
            "export type Account = { name: string };",
          ].join("\n"),
        ),
      ).toEqual({
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
              documentName: "TypeScriptDocument",
              availableDeclarations: ["Account", "User"],
              availableExportedDeclarations: ["Account", "User"],
              rootCandidates: ["Account", "User"],
              exportedRootCandidates: ["Account", "User"],
              implicitEntryAmbiguityReason:
                "multiple-exported-root-candidates",
              sourceLocation: {
                start: { offset: 0, line: 1, column: 1 },
                end: { offset: 74, line: 2, column: 40 },
                length: 74,
              },
            },
          },
        ],
      });
    });
  });

  describe("basic declarations", () => {
    it("parses the first minimal object declaration slice", () => {
      expect(preparedTypeScriptParserOptions.errors).toEqual([]);

      expect(
        typeScriptParser.parse(
          "type User = { id: number; name?: string | null }",
          {
            entry: "User",
            name: "UserDocument",
          },
        ),
      ).toEqual({
        ok: true,
        document: schemaDocument("UserDocument", schemaReferenceNode("User"), {
          definitions: [
            schemaDefinition(
              "User",
              schemaObjectNode([
                schemaFieldNode("id", schemaScalarNode("number")),
                schemaFieldNode("name", schemaScalarNode("string"), {
                  required: false,
                  nullable: true,
                }),
              ]),
            ),
          ],
        }),
      });
    });

    it("parses a simple object type alias with required fields", () => {
      expect(
        typeScriptParser.parse("type User = { id: number; name: string }", {
          entry: "User",
          name: "SimpleUserDocument",
        }),
      ).toEqual({
        ok: true,
        document: schemaDocument(
          "SimpleUserDocument",
          schemaReferenceNode("User"),
          {
            definitions: [
              schemaDefinition(
                "User",
                schemaObjectNode([
                  schemaFieldNode("id", schemaScalarNode("number")),
                  schemaFieldNode("name", schemaScalarNode("string")),
                ]),
              ),
            ],
          },
        ),
      });
    });

    it("parses exported top-level declarations when their underlying schema subset is supported", () => {
      expect(
        typeScriptParser.parse(
          [
            "export interface User {",
            "  id: number;",
            "}",
            "export type UserList = ReadonlyArray<User>;",
          ].join("\n"),
          {
            entry: "UserList",
            name: "ExportedUserListDocument",
          },
        ),
      ).toEqual({
        ok: true,
        document: schemaDocument(
          "ExportedUserListDocument",
          schemaReferenceNode("UserList"),
          {
            definitions: [
              schemaDefinition(
                "User",
                schemaObjectNode([
                  schemaFieldNode("id", schemaScalarNode("number")),
                ]),
              ),
              schemaDefinition(
                "UserList",
                schemaArrayNode(schemaReferenceNode("User")),
              ),
            ],
          },
        ),
      });
    });

    it("parses optional-only and nullable-only field semantics distinctly", () => {
      expect(
        typeScriptParser.parse(
          "type User = { optionalName?: string; nullableName: string | null }",
          {
            entry: "User",
            name: "FieldSemanticsDocument",
          },
        ),
      ).toEqual({
        ok: true,
        document: schemaDocument(
          "FieldSemanticsDocument",
          schemaReferenceNode("User"),
          {
            definitions: [
              schemaDefinition(
                "User",
                schemaObjectNode([
                  schemaFieldNode("optionalName", schemaScalarNode("string"), {
                    required: false,
                  }),
                  schemaFieldNode("nullableName", schemaScalarNode("string"), {
                    nullable: true,
                  }),
                ]),
              ),
            ],
          },
        ),
      });
    });

    it("parses interface declarations as named reusable definitions", () => {
      expect(
        typeScriptParser.parse(
          "interface User { id: number; active: boolean }",
          {
            entry: "User",
            name: "UserInterfaceDocument",
          },
        ),
      ).toEqual({
        ok: true,
        document: schemaDocument(
          "UserInterfaceDocument",
          schemaReferenceNode("User"),
          {
            definitions: [
              schemaDefinition(
                "User",
                schemaObjectNode([
                  schemaFieldNode("id", schemaScalarNode("number")),
                  schemaFieldNode("active", schemaScalarNode("boolean")),
                ]),
              ),
            ],
          },
        ),
      });
    });
  });

  describe("root schema shapes", () => {
    it("parses array, union, and named reference reuse for a reachable top-level declaration", () => {
      expect(
        typeScriptParser.parse(
          [
            "type User = { id: number };",
            "type UserList = Array<User | null>;",
          ].join("\n"),
          {
            entry: "UserList",
            name: "UserListDocument",
          },
        ),
      ).toEqual({
        ok: true,
        document: schemaDocument(
          "UserListDocument",
          schemaReferenceNode("UserList"),
          {
            definitions: [
              schemaDefinition(
                "User",
                schemaObjectNode([
                  schemaFieldNode("id", schemaScalarNode("number")),
                ]),
              ),
              schemaDefinition(
                "UserList",
                schemaArrayNode(
                  schemaUnionNode([
                    schemaReferenceNode("User"),
                    schemaNullNode(),
                  ]),
                ),
              ),
            ],
          },
        ),
      });
    });

    it("parses array shorthand, direct union roots, and null roots", () => {
      expect(
        typeScriptParser.parse(
          "type UserList = User[]\ntype User = { id: number }",
          {
            entry: "UserList",
            name: "UserListArrayDocument",
          },
        ),
      ).toEqual({
        ok: true,
        document: schemaDocument(
          "UserListArrayDocument",
          schemaReferenceNode("UserList"),
          {
            definitions: [
              schemaDefinition(
                "User",
                schemaObjectNode([
                  schemaFieldNode("id", schemaScalarNode("number")),
                ]),
              ),
              schemaDefinition(
                "UserList",
                schemaArrayNode(schemaReferenceNode("User")),
              ),
            ],
          },
        ),
      });

      expect(
        typeScriptParser.parse("type Value = string | number", {
          entry: "Value",
          name: "ValueDocument",
        }),
      ).toEqual({
        ok: true,
        document: schemaDocument(
          "ValueDocument",
          schemaReferenceNode("Value"),
          {
            definitions: [
              schemaDefinition(
                "Value",
                schemaUnionNode([
                  schemaScalarNode("string"),
                  schemaScalarNode("number"),
                ]),
              ),
            ],
          },
        ),
      });

      expect(
        typeScriptParser.parse("type DisplayName = string", {
          entry: "DisplayName",
          name: "DisplayNameDocument",
        }),
      ).toEqual({
        ok: true,
        document: schemaDocument(
          "DisplayNameDocument",
          schemaReferenceNode("DisplayName"),
          {
            definitions: [
              schemaDefinition("DisplayName", schemaScalarNode("string")),
            ],
          },
        ),
      });

      expect(
        typeScriptParser.parse('type OpenStatus = "open"', {
          entry: "OpenStatus",
          name: "OpenStatusDocument",
        }),
      ).toEqual({
        ok: true,
        document: schemaDocument(
          "OpenStatusDocument",
          schemaReferenceNode("OpenStatus"),
          {
            definitions: [
              schemaDefinition("OpenStatus", schemaLiteralNode("open")),
            ],
          },
        ),
      });

      expect(
        typeScriptParser.parse("type OnlyNull = null", {
          entry: "OnlyNull",
          name: "OnlyNullDocument",
        }),
      ).toEqual({
        ok: true,
        document: schemaDocument(
          "OnlyNullDocument",
          schemaReferenceNode("OnlyNull"),
          {
            definitions: [schemaDefinition("OnlyNull", schemaNullNode())],
          },
        ),
      });
    });

    it("parses numeric and boolean literal roots without widening them", () => {
      expect(
        typeScriptParser.parse("type RetryCount = 3", {
          entry: "RetryCount",
          name: "RetryCountDocument",
        }),
      ).toEqual({
        ok: true,
        document: schemaDocument(
          "RetryCountDocument",
          schemaReferenceNode("RetryCount"),
          {
            definitions: [schemaDefinition("RetryCount", schemaLiteralNode(3))],
          },
        ),
      });

      expect(
        typeScriptParser.parse("type Enabled = true", {
          entry: "Enabled",
          name: "EnabledDocument",
        }),
      ).toEqual({
        ok: true,
        document: schemaDocument(
          "EnabledDocument",
          schemaReferenceNode("Enabled"),
          {
            definitions: [schemaDefinition("Enabled", schemaLiteralNode(true))],
          },
        ),
      });
    });

    it("parses tuple declarations", () => {
      expect(
        typeScriptParser.parse("type Pair = [number, string]", {
          entry: "Pair",
          name: "PairDocument",
        }),
      ).toEqual({
        ok: true,
        document: schemaDocument("PairDocument", schemaReferenceNode("Pair"), {
          definitions: [
            schemaDefinition(
              "Pair",
              schemaTupleNode([
                schemaScalarNode("number"),
                schemaScalarNode("string"),
              ]),
            ),
          ],
        }),
      });
    });

    it("parses named and optional tuple members", () => {
      expect(
        typeScriptParser.parse(
          "type Pair = [id: number, label?: string, active: boolean]",
          {
            entry: "Pair",
            name: "PairDocument",
          },
        ),
      ).toEqual({
        ok: true,
        document: schemaDocument("PairDocument", schemaReferenceNode("Pair"), {
          definitions: [
            schemaDefinition(
              "Pair",
              schemaTupleNode([
                schemaScalarNode("number"),
                schemaTupleElement(schemaScalarNode("string"), {
                  required: false,
                }),
                schemaScalarNode("boolean"),
              ]),
            ),
          ],
        }),
      });
    });
  });

  describe("reachable definition graphs", () => {
    it("parses nested object, array, and named reference compositions", () => {
      expect(
        typeScriptParser.parse(
          [
            "type User = { id: number; status: Status };",
            'type Status = "open" | "closed";',
            "type Response = { users: User[]; metadata: Record<string, number> };",
          ].join("\n"),
          {
            entry: "Response",
            name: "ResponseDocument",
          },
        ),
      ).toEqual({
        ok: true,
        document: schemaDocument(
          "ResponseDocument",
          schemaReferenceNode("Response"),
          {
            definitions: [
              schemaDefinition(
                "Status",
                schemaUnionNode([
                  schemaLiteralNode("open"),
                  schemaLiteralNode("closed"),
                ]),
              ),
              schemaDefinition(
                "User",
                schemaObjectNode([
                  schemaFieldNode("id", schemaScalarNode("number")),
                  schemaFieldNode("status", schemaReferenceNode("Status")),
                ]),
              ),
              schemaDefinition(
                "Response",
                schemaObjectNode([
                  schemaFieldNode(
                    "users",
                    schemaArrayNode(schemaReferenceNode("User")),
                  ),
                  schemaFieldNode(
                    "metadata",
                    schemaRecordNode(
                      schemaScalarNode("string"),
                      schemaScalarNode("number"),
                    ),
                  ),
                ]),
              ),
            ],
          },
        ),
      });
    });

    it("emits only definitions reachable from the selected entry", () => {
      expect(
        typeScriptParser.parse(
          [
            "type Audit = { at: string };",
            "type User = { id: number; audit: Audit };",
            "type Response = { users: User[] };",
            "type Unused = { debug: boolean };",
          ].join("\n"),
          {
            entry: "Response",
            name: "ReachableDefinitionsDocument",
          },
        ),
      ).toEqual({
        ok: true,
        document: schemaDocument(
          "ReachableDefinitionsDocument",
          schemaReferenceNode("Response"),
          {
            definitions: [
              schemaDefinition(
                "Audit",
                schemaObjectNode([
                  schemaFieldNode("at", schemaScalarNode("string")),
                ]),
              ),
              schemaDefinition(
                "User",
                schemaObjectNode([
                  schemaFieldNode("id", schemaScalarNode("number")),
                  schemaFieldNode("audit", schemaReferenceNode("Audit")),
                ]),
              ),
              schemaDefinition(
                "Response",
                schemaObjectNode([
                  schemaFieldNode(
                    "users",
                    schemaArrayNode(schemaReferenceNode("User")),
                  ),
                ]),
              ),
            ],
          },
        ),
      });
    });

    it("parses transitive nested unions, tuples, and records behind the selected entry", () => {
      expect(
        typeScriptParser.parse(
          [
            'type Status = "open" | "closed";',
            "type Metrics = Record<string, number | null>;",
            "type User = { id: number; status: Status; aliases: [string, string?] };",
            "type Response = { users: User[]; metrics: Metrics };",
          ].join("\n"),
          {
            entry: "Response",
            name: "TransitiveResponseDocument",
          },
        ),
      ).toEqual({
        ok: true,
        document: schemaDocument(
          "TransitiveResponseDocument",
          schemaReferenceNode("Response"),
          {
            definitions: [
              schemaDefinition(
                "Status",
                schemaUnionNode([
                  schemaLiteralNode("open"),
                  schemaLiteralNode("closed"),
                ]),
              ),
              schemaDefinition(
                "User",
                schemaObjectNode([
                  schemaFieldNode("id", schemaScalarNode("number")),
                  schemaFieldNode("status", schemaReferenceNode("Status")),
                  schemaFieldNode(
                    "aliases",
                    schemaTupleNode([
                      schemaScalarNode("string"),
                      schemaTupleElement(schemaScalarNode("string"), {
                        required: false,
                      }),
                    ]),
                  ),
                ]),
              ),
              schemaDefinition(
                "Metrics",
                schemaRecordNode(
                  schemaScalarNode("string"),
                  schemaUnionNode([
                    schemaScalarNode("number"),
                    schemaNullNode(),
                  ]),
                ),
              ),
              schemaDefinition(
                "Response",
                schemaObjectNode([
                  schemaFieldNode(
                    "users",
                    schemaArrayNode(schemaReferenceNode("User")),
                  ),
                  schemaFieldNode("metrics", schemaReferenceNode("Metrics")),
                ]),
              ),
            ],
          },
        ),
      });
    });

    it("keeps nested anonymous object shapes inline inside the reachable definition graph", () => {
      expect(
        typeScriptParser.parse(
          [
            "type Response = {",
            "  users: Array<{",
            "    profile: {",
            "      name: string;",
            "      tags: [string, string?];",
            "    };",
            "    metadata: Record<string, boolean>;",
            "  }>;",
            "};",
          ].join("\n"),
          {
            entry: "Response",
            name: "InlineNestedDocument",
          },
        ),
      ).toEqual({
        ok: true,
        document: schemaDocument(
          "InlineNestedDocument",
          schemaReferenceNode("Response"),
          {
            definitions: [
              schemaDefinition(
                "Response",
                schemaObjectNode([
                  schemaFieldNode(
                    "users",
                    schemaArrayNode(
                      schemaObjectNode([
                        schemaFieldNode(
                          "profile",
                          schemaObjectNode([
                            schemaFieldNode("name", schemaScalarNode("string")),
                            schemaFieldNode(
                              "tags",
                              schemaTupleNode([
                                schemaScalarNode("string"),
                                schemaTupleElement(schemaScalarNode("string"), {
                                  required: false,
                                }),
                              ]),
                            ),
                          ]),
                        ),
                        schemaFieldNode(
                          "metadata",
                          schemaRecordNode(
                            schemaScalarNode("string"),
                            schemaScalarNode("boolean"),
                          ),
                        ),
                      ]),
                    ),
                  ),
                ]),
              ),
            ],
          },
        ),
      });
    });

    it("deduplicates shared reachable dependencies and emits them in dependency-first order", () => {
      expect(
        typeScriptParser.parse(
          [
            'type Status = "open" | "closed";',
            "type User = { id: number; status: Status };",
            "type Audit = { actor: User; subject: User };",
            "type Response = { audit: Audit; reviewers: User[] };",
          ].join("\n"),
          {
            entry: "Response",
            name: "DependencyOrderDocument",
          },
        ),
      ).toEqual({
        ok: true,
        document: schemaDocument(
          "DependencyOrderDocument",
          schemaReferenceNode("Response"),
          {
            definitions: [
              schemaDefinition(
                "Status",
                schemaUnionNode([
                  schemaLiteralNode("open"),
                  schemaLiteralNode("closed"),
                ]),
              ),
              schemaDefinition(
                "User",
                schemaObjectNode([
                  schemaFieldNode("id", schemaScalarNode("number")),
                  schemaFieldNode("status", schemaReferenceNode("Status")),
                ]),
              ),
              schemaDefinition(
                "Audit",
                schemaObjectNode([
                  schemaFieldNode("actor", schemaReferenceNode("User")),
                  schemaFieldNode("subject", schemaReferenceNode("User")),
                ]),
              ),
              schemaDefinition(
                "Response",
                schemaObjectNode([
                  schemaFieldNode("audit", schemaReferenceNode("Audit")),
                  schemaFieldNode(
                    "reviewers",
                    schemaArrayNode(schemaReferenceNode("User")),
                  ),
                ]),
              ),
            ],
          },
        ),
      });
    });

    it("parses mixed interface and type-alias declarations across the same reachable graph", () => {
      expect(
        typeScriptParser.parse(
          [
            "interface Audit { at: string; actor: string }",
            'type Status = "open" | "closed";',
            "interface User { id: number; audit: Audit; status: Status }",
            "type Response = { users: User[] }",
          ].join("\n"),
          {
            entry: "Response",
            name: "MixedDeclarationsDocument",
          },
        ),
      ).toEqual({
        ok: true,
        document: schemaDocument(
          "MixedDeclarationsDocument",
          schemaReferenceNode("Response"),
          {
            definitions: [
              schemaDefinition(
                "Audit",
                schemaObjectNode([
                  schemaFieldNode("at", schemaScalarNode("string")),
                  schemaFieldNode("actor", schemaScalarNode("string")),
                ]),
              ),
              schemaDefinition(
                "Status",
                schemaUnionNode([
                  schemaLiteralNode("open"),
                  schemaLiteralNode("closed"),
                ]),
              ),
              schemaDefinition(
                "User",
                schemaObjectNode([
                  schemaFieldNode("id", schemaScalarNode("number")),
                  schemaFieldNode("audit", schemaReferenceNode("Audit")),
                  schemaFieldNode("status", schemaReferenceNode("Status")),
                ]),
              ),
              schemaDefinition(
                "Response",
                schemaObjectNode([
                  schemaFieldNode(
                    "users",
                    schemaArrayNode(schemaReferenceNode("User")),
                  ),
                ]),
              ),
            ],
          },
        ),
      });
    });
  });

  describe("composed field types", () => {
    it("treats Array<T> and T[] as equivalent across nested reachable fields", () => {
      expect(
        typeScriptParser.parse(
          [
            "type User = { id: number };",
            "type Response = { primary: Array<User>; secondary: User[] };",
          ].join("\n"),
          {
            entry: "Response",
            name: "ArrayStyleDocument",
          },
        ),
      ).toEqual({
        ok: true,
        document: schemaDocument(
          "ArrayStyleDocument",
          schemaReferenceNode("Response"),
          {
            definitions: [
              schemaDefinition(
                "User",
                schemaObjectNode([
                  schemaFieldNode("id", schemaScalarNode("number")),
                ]),
              ),
              schemaDefinition(
                "Response",
                schemaObjectNode([
                  schemaFieldNode(
                    "primary",
                    schemaArrayNode(schemaReferenceNode("User")),
                  ),
                  schemaFieldNode(
                    "secondary",
                    schemaArrayNode(schemaReferenceNode("User")),
                  ),
                ]),
              ),
            ],
          },
        ),
      });
    });

    it("preserves nullability inside nested unions without collapsing optionality", () => {
      expect(
        typeScriptParser.parse(
          [
            'type Status = "open" | "closed";',
            "type Response = { value?: Array<Status | null> | null };",
          ].join("\n"),
          {
            entry: "Response",
            name: "NestedNullabilityDocument",
          },
        ),
      ).toEqual({
        ok: true,
        document: schemaDocument(
          "NestedNullabilityDocument",
          schemaReferenceNode("Response"),
          {
            definitions: [
              schemaDefinition(
                "Status",
                schemaUnionNode([
                  schemaLiteralNode("open"),
                  schemaLiteralNode("closed"),
                ]),
              ),
              schemaDefinition(
                "Response",
                schemaObjectNode([
                  schemaFieldNode(
                    "value",
                    schemaArrayNode(
                      schemaUnionNode([
                        schemaReferenceNode("Status"),
                        schemaNullNode(),
                      ]),
                    ),
                    {
                      required: false,
                      nullable: true,
                    },
                  ),
                ]),
              ),
            ],
          },
        ),
      });
    });

    it("parses tuple members that contain unions and nulls", () => {
      expect(
        typeScriptParser.parse(
          [
            'type Status = "open" | "closed";',
            "type Row = [Status | null, number | string, boolean?];",
          ].join("\n"),
          {
            entry: "Row",
            name: "RowDocument",
          },
        ),
      ).toEqual({
        ok: true,
        document: schemaDocument("RowDocument", schemaReferenceNode("Row"), {
          definitions: [
            schemaDefinition(
              "Status",
              schemaUnionNode([
                schemaLiteralNode("open"),
                schemaLiteralNode("closed"),
              ]),
            ),
            schemaDefinition(
              "Row",
              schemaTupleNode([
                schemaUnionNode([
                  schemaReferenceNode("Status"),
                  schemaNullNode(),
                ]),
                schemaUnionNode([
                  schemaScalarNode("number"),
                  schemaScalarNode("string"),
                ]),
                schemaTupleElement(schemaScalarNode("boolean"), {
                  required: false,
                }),
              ]),
            ),
          ],
        }),
      });
    });

    it("parses record values with nested arrays and object references", () => {
      expect(
        typeScriptParser.parse(
          [
            "type User = { id: number; name: string };",
            "type Response = { grouped: Record<string, Array<User | null>> };",
          ].join("\n"),
          {
            entry: "Response",
            name: "GroupedResponseDocument",
          },
        ),
      ).toEqual({
        ok: true,
        document: schemaDocument(
          "GroupedResponseDocument",
          schemaReferenceNode("Response"),
          {
            definitions: [
              schemaDefinition(
                "User",
                schemaObjectNode([
                  schemaFieldNode("id", schemaScalarNode("number")),
                  schemaFieldNode("name", schemaScalarNode("string")),
                ]),
              ),
              schemaDefinition(
                "Response",
                schemaObjectNode([
                  schemaFieldNode(
                    "grouped",
                    schemaRecordNode(
                      schemaScalarNode("string"),
                      schemaArrayNode(
                        schemaUnionNode([
                          schemaReferenceNode("User"),
                          schemaNullNode(),
                        ]),
                      ),
                    ),
                  ),
                ]),
              ),
            ],
          },
        ),
      });
    });

    it("parses literal unions and record utility types", () => {
      expect(
        typeScriptParser.parse(
          [
            'type Status = "open" | "closed";',
            "type Messages = Record<string, Status>;",
          ].join("\n"),
          {
            entry: "Messages",
            name: "MessagesDocument",
          },
        ),
      ).toEqual({
        ok: true,
        document: schemaDocument(
          "MessagesDocument",
          schemaReferenceNode("Messages"),
          {
            definitions: [
              schemaDefinition(
                "Status",
                schemaUnionNode([
                  schemaLiteralNode("open"),
                  schemaLiteralNode("closed"),
                ]),
              ),
              schemaDefinition(
                "Messages",
                schemaRecordNode(
                  schemaScalarNode("string"),
                  schemaReferenceNode("Status"),
                ),
              ),
            ],
          },
        ),
      });
    });

    it("accepts readonly modifiers without changing schema IR semantics", () => {
      expect(
        typeScriptParser.parse(
          [
            "interface User {",
            "  readonly id: number;",
            "  readonly tags: readonly string[];",
            "  readonly pair: readonly [number, string?];",
            "  readonly names: ReadonlyArray<string>;",
            "}",
          ].join("\n"),
          {
            entry: "User",
            name: "ReadonlyUserDocument",
          },
        ),
      ).toEqual({
        ok: true,
        document: schemaDocument(
          "ReadonlyUserDocument",
          schemaReferenceNode("User"),
          {
            definitions: [
              schemaDefinition(
                "User",
                schemaObjectNode([
                  schemaFieldNode("id", schemaScalarNode("number")),
                  schemaFieldNode(
                    "tags",
                    schemaArrayNode(schemaScalarNode("string")),
                  ),
                  schemaFieldNode(
                    "pair",
                    schemaTupleNode([
                      schemaScalarNode("number"),
                      schemaTupleElement(schemaScalarNode("string"), {
                        required: false,
                      }),
                    ]),
                  ),
                  schemaFieldNode(
                    "names",
                    schemaArrayNode(schemaScalarNode("string")),
                  ),
                ]),
              ),
            ],
          },
        ),
        semanticNotes: [
          {
            kind: "normalization",
            code: "typescript-readonly-property-lowered",
            message:
              "This TypeScript readonly property was lowered into ordinary shared field semantics.",
            path: ["definitions", "User", "id"],
            nodeKind: "field",
            source: "parser-typescript",
            layer: "shape",
            evidence: {
              sourceKeyword: "readonly",
            },
          },
          {
            kind: "normalization",
            code: "typescript-readonly-property-lowered",
            message:
              "This TypeScript readonly property was lowered into ordinary shared field semantics.",
            path: ["definitions", "User", "tags"],
            nodeKind: "field",
            source: "parser-typescript",
            layer: "shape",
            evidence: {
              sourceKeyword: "readonly",
            },
          },
          {
            kind: "normalization",
            code: "typescript-readonly-property-lowered",
            message:
              "This TypeScript readonly property was lowered into ordinary shared field semantics.",
            path: ["definitions", "User", "pair"],
            nodeKind: "field",
            source: "parser-typescript",
            layer: "shape",
            evidence: {
              sourceKeyword: "readonly",
            },
          },
          {
            kind: "normalization",
            code: "typescript-readonly-property-lowered",
            message:
              "This TypeScript readonly property was lowered into ordinary shared field semantics.",
            path: ["definitions", "User", "names"],
            nodeKind: "field",
            source: "parser-typescript",
            layer: "shape",
            evidence: {
              sourceKeyword: "readonly",
            },
          },
        ],
      });
    });
  });

  describe("enum support", () => {
    it("parses enum declarations as literal definitions and reachable references", () => {
      expect(
        typeScriptParser.parse(
          [
            'enum Status { Open = "open", Closed = "closed" }',
            "type Response = { status: Status }",
          ].join("\n"),
          {
            entry: "Response",
            name: "EnumResponseDocument",
          },
        ),
      ).toEqual({
        ok: true,
        document: schemaDocument(
          "EnumResponseDocument",
          schemaReferenceNode("Response"),
          {
            definitions: [
              schemaDefinition(
                "Status",
                schemaUnionNode([
                  schemaLiteralNode("open"),
                  schemaLiteralNode("closed"),
                ]),
              ),
              schemaDefinition(
                "Response",
                schemaObjectNode([
                  schemaFieldNode("status", schemaReferenceNode("Status")),
                ]),
              ),
            ],
          },
        ),
        semanticNotes: [
          {
            kind: "normalization",
            code: "typescript-enum-lowered",
            message:
              "This TypeScript enum declaration was lowered into shared literal or literal-union schema semantics.",
            path: ["definitions", "Status"],
            nodeKind: "definition",
            source: "parser-typescript",
            layer: "shape",
            evidence: {
              enumName: "Status",
              memberCount: 2,
              loweredForm: "literal-union",
              containsMemberReferences: false,
            },
          },
        ],
      });
    });

    it("parses numeric enum declarations with implicit and explicit values", () => {
      expect(
        typeScriptParser.parse("enum Level { Low, Medium = 3, High }", {
          entry: "Level",
          name: "LevelDocument",
        }),
      ).toEqual({
        ok: true,
        document: schemaDocument(
          "LevelDocument",
          schemaReferenceNode("Level"),
          {
            definitions: [
              schemaDefinition(
                "Level",
                schemaUnionNode([
                  schemaLiteralNode(0),
                  schemaLiteralNode(3),
                  schemaLiteralNode(4),
                ]),
              ),
            ],
          },
        ),
        semanticNotes: [
          {
            kind: "normalization",
            code: "typescript-enum-lowered",
            message:
              "This TypeScript enum declaration was lowered into shared literal or literal-union schema semantics.",
            path: ["definitions", "Level"],
            nodeKind: "definition",
            source: "parser-typescript",
            layer: "shape",
            evidence: {
              enumName: "Level",
              memberCount: 3,
              loweredForm: "literal-union",
              containsMemberReferences: false,
            },
          },
        ],
      });
    });

    it("parses enum member references to earlier members", () => {
      expect(
        typeScriptParser.parse(
          "enum Level { Low = 1, SameLow = Low, AlsoLow = Level.Low, High = 3 }",
          {
            entry: "Level",
            name: "ReferencedLevelDocument",
          },
        ),
      ).toEqual({
        ok: true,
        document: schemaDocument(
          "ReferencedLevelDocument",
          schemaReferenceNode("Level"),
          {
            definitions: [
              schemaDefinition(
                "Level",
                schemaUnionNode([schemaLiteralNode(1), schemaLiteralNode(3)]),
              ),
            ],
          },
        ),
        semanticNotes: [
          {
            kind: "normalization",
            code: "typescript-enum-lowered",
            message:
              "This TypeScript enum declaration was lowered into shared literal or literal-union schema semantics.",
            path: ["definitions", "Level"],
            nodeKind: "definition",
            source: "parser-typescript",
            layer: "shape",
            evidence: {
              enumName: "Level",
              memberCount: 4,
              loweredForm: "literal-union",
              containsMemberReferences: true,
            },
          },
        ],
      });
    });
  });
});
