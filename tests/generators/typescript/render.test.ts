import { describe, expect, it } from "vitest";
import {
  createNamingStrategy,
  type SchemaDocument,
  schemaArrayNode,
  schemaDefinition,
  schemaFieldNode,
  identifierName,
  schemaLiteralNode,
  schemaNullNode,
  schemaObjectNode,
  schemaReferenceNode,
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
      generateTypeScript(
        schemaDocument("ScalarString", schemaScalarNode("string")),
      ),
    ).toBe("export type ScalarString = string;");

    expect(
      generateTypeScript(
        schemaDocument(
          "UserList",
          schemaArrayNode(
            schemaObjectNode([
              schemaFieldNode("id", schemaScalarNode("integer")),
            ]),
          ),
        ),
      ),
    ).toBe(
      ["export type UserList = Array<{", "  id: number;", "}>;"].join("\n"),
    );
  });

  it("uses smart arrayStyle by default", () => {
    expect(
      generateTypeScript(
        schemaDocument(
          "NumberList",
          schemaArrayNode(schemaScalarNode("number")),
        ),
      ),
    ).toBe("export type NumberList = number[];");

    expect(
      generateTypeScript(
        schemaDocument("UnionList", schemaArrayNode(schemaNullNode())),
      ),
    ).toBe("export type UnionList = null[];");
  });

  it('supports arrayStyle: "generic" and "compact"', () => {
    expect(
      generateTypeScript(
        schemaDocument(
          "NumberList",
          schemaArrayNode(schemaScalarNode("number")),
        ),
        {
          arrayStyle: "generic",
        },
      ),
    ).toBe("export type NumberList = Array<number>;");

    expect(
      generateTypeScript(
        schemaDocument(
          "UserList",
          schemaArrayNode(
            schemaObjectNode([
              schemaFieldNode("id", schemaScalarNode("integer")),
            ]),
          ),
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
          schemaArrayNode(
            schemaObjectNode([
              schemaFieldNode("id", schemaScalarNode("integer")),
            ]),
          ),
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
            schemaObjectNode([
              schemaFieldNode("label", schemaScalarNode("string")),
            ]),
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

  it("supports the json -> schema ir -> typescript chain", () => {
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
      schemaObjectNode([
        schemaFieldNode("user_id", schemaScalarNode("integer")),
      ]),
    );

    expect(typeScriptGenerator.generate(doc)).toEqual({
      ok: true,
      output: ["export interface UserProfile {", "  userId: number;", "}"].join(
        "\n",
      ),
      diagnostics: [integerWideningDiagnostic(["root", "user_id"])],
      semanticNotes: [integerWideningSemanticNote(["root", "user_id"])],
    });

    expect(
      tryGenerateTypeScript(
        schemaDocument(
          "NumberList",
          schemaArrayNode(schemaScalarNode("number")),
        ),
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
      generateTypeScript(schemaDocument("StandaloneNull", schemaNullNode())),
    ).toBe("export type StandaloneNull = null;");

    expect(
      generateTypeScript(
        schemaDocument(
          "EmptyArray",
          schemaArrayNode(
            schemaUnknownNode({
              reason: "empty-array-element",
              evidence: {
                source: "parser-json",
                detail: "empty sample",
              },
            }),
          ),
        ),
      ),
    ).toBe("export type EmptyArray = unknown[];");

    expect(
      generateTypeScript(
        schemaDocument(
          "CollapsedUnknown",
          schemaArrayNode(
            schemaUnknownNode({
              reason: "mixed-types-collapsed",
              evidence: {
                source: "parser-json",
                detail: "mixed scalar samples",
                observedKinds: ["boolean", "string"],
              },
            }),
          ),
        ),
      ),
    ).toBe("export type CollapsedUnknown = unknown[];");

    expect(
      tryGenerateTypeScript(
        schemaDocument(
          "CollapsedUnknown",
          schemaArrayNode(
            schemaUnknownNode({
              reason: "mixed-types-collapsed",
              evidence: {
                source: "parser-json",
                detail: "mixed scalar samples",
                observedKinds: ["boolean", "string"],
              },
            }),
          ),
        ),
      ),
    ).toEqual({
      ok: true,
      output: "export type CollapsedUnknown = unknown[];",
      diagnostics: [
        unknownWideningDiagnostic(["root", "elementType"], {
          reason: "mixed-types-collapsed",
          nullable: false,
          renderedForm: "unknown",
          sourceEvidence: {
            source: "parser-json",
            detail: "mixed scalar samples",
            observedKinds: ["boolean", "string"],
          },
        }),
      ],
      semanticNotes: [
        unknownWideningSemanticNote(["root", "elementType"], {
          reason: "mixed-types-collapsed",
          nullable: false,
          renderedForm: "unknown",
          sourceEvidence: {
            source: "parser-json",
            detail: "mixed scalar samples",
            observedKinds: ["boolean", "string"],
          },
        }),
      ],
    });
  });

  it("reports widened unions when an unknown member absorbs narrower branches", () => {
    expect(
      tryGenerateTypeScript(
        schemaDocument(
          "WideValues",
          schemaUnionNode([
            schemaLiteralNode("open"),
            schemaUnknownNode({
              reason: "no-evidence",
              evidence: {
                source: "parser-json",
                detail: "JSON Schema boolean true was lowered to unknown.",
              },
            }),
          ]),
        ),
      ),
    ).toEqual({
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

  it("reports widened unions when an unknown definition is included by reference", () => {
    expect(
      tryGenerateTypeScript(
        schemaDocument(
          "WideValues",
          schemaUnionNode([
            schemaLiteralNode("open"),
            schemaReferenceNode("FallbackValue"),
          ]),
          {
            definitions: [
              schemaDefinition(
                "FallbackValue",
                schemaUnknownNode({
                  reason: "no-evidence",
                  evidence: {
                    source: "parser-json",
                    detail: "JSON Schema boolean true was lowered to unknown.",
                  },
                }),
              ),
            ],
          },
        ),
      ),
    ).toEqual({
      ok: true,
      output: [
        "export type FallbackValue = unknown;",
        "",
        'export type WideValues = "open" | FallbackValue;',
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
        unknownUnionWideningDiagnostic(["root"], [1], ["literal", "reference"]),
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
          ["root"],
          [1],
          ["literal", "reference"],
        ),
      ],
    });
  });

  it("renders literal nodes in TypeScript output", () => {
    expect(
      generateTypeScript(
        schemaDocument("LiteralStatus", schemaLiteralNode("open")),
      ),
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
          schemaUnionNode([
            schemaScalarNode("string"),
            schemaScalarNode("integer"),
          ]),
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
          schemaTupleNode([
            schemaScalarNode("integer"),
            schemaLiteralNode("north"),
          ]),
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
              schemaTupleNode([
                schemaScalarNode("integer"),
                schemaScalarNode("string"),
              ]),
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

    expect(
      generateTypeScript(
        schemaDocument(
          "RequiredAfterOptionalTuple",
          schemaTupleNode([
            schemaScalarNode("integer"),
            schemaTupleElement(schemaScalarNode("string"), {
              required: false,
            }),
            schemaScalarNode("boolean"),
          ]),
        ),
      ),
    ).toBe(
      "export type RequiredAfterOptionalTuple = [number, string?, boolean];",
    );
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

  it("returns structured failures for non-string record keys on runtime documents", () => {
    const doc: SchemaDocument = {
      version: "0.1",
      kind: "document",
      name: identifierName("BrokenRecord"),
      definitions: [],
      root: {
        kind: "record",
        key: schemaScalarNode("integer"),
        value: schemaScalarNode("string"),
      },
    };

    expect(tryGenerateTypeScript(doc)).toEqual({
      ok: false,
      code: "invalid-record-key",
      message:
        "TypeScript record keys must currently render from string scalar keys.",
      diagnostics: [
        {
          severity: "error",
          code: "invalid-record-key",
          message:
            "TypeScript record keys must currently render from string scalar keys.",
          path: ["root", "key"],
          nodeKind: "record",
          source: "generator-typescript",
        },
      ],
    });
  });

  it("renders reusable object definitions before the root export", () => {
    const doc = schemaDocument(
      "UserDirectory",
      schemaObjectNode([
        schemaFieldNode("users", schemaArrayNode(schemaReferenceNode("User"))),
      ]),
      {
        definitions: [
          schemaDefinition(
            "User",
            schemaObjectNode([
              schemaFieldNode("id", schemaScalarNode("integer")),
            ]),
          ),
        ],
      },
    );

    expect(generateTypeScript(doc)).toBe(
      [
        "export interface User {",
        "  id: number;",
        "}",
        "",
        "export interface UserDirectory {",
        "  users: User[];",
        "}",
      ].join("\n"),
    );
  });

  it("renders non-object definitions as type aliases", () => {
    const doc = schemaDocument("TeamState", schemaReferenceNode("Status"), {
      definitions: [
        schemaDefinition(
          "Status",
          schemaUnionNode([
            schemaLiteralNode("active"),
            schemaLiteralNode("paused"),
          ]),
        ),
      ],
    });

    expect(generateTypeScript(doc)).toBe(
      [
        'export type Status = "active" | "paused";',
        "",
        "export type TeamState = Status;",
      ].join("\n"),
    );
  });

  it("applies naming strategy consistently to definitions and references", () => {
    const doc = schemaDocument(
      "user-directory",
      schemaArrayNode(schemaReferenceNode("user-profile")),
      {
        definitions: [
          schemaDefinition(
            "user-profile",
            schemaObjectNode([
              schemaFieldNode("display-name", schemaScalarNode("string")),
            ]),
          ),
        ],
      },
    );

    expect(
      generateTypeScript(doc, {
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
      [
        "export interface user_profile {",
        "  display_name: string;",
        "}",
        "",
        "export type user_directory = user_profile[];",
      ].join("\n"),
    );
  });

  it("wraps nullable union field types correctly", () => {
    const doc = schemaDocument(
      "NullableUnionShape",
      schemaObjectNode([
        schemaFieldNode(
          "value",
          schemaUnionNode([
            schemaScalarNode("string"),
            schemaScalarNode("integer"),
          ]),
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
        schemaDocument("EscapedLiteral", schemaLiteralNode('a"b\\c\nline')),
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
      schemaObjectNode([
        schemaFieldNode("userId", schemaScalarNode("integer")),
      ]),
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
            sourceName: "UserProfile",
          },
        },
      ],
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
      schemaObjectNode([
        schemaFieldNode("userId", schemaScalarNode("integer")),
      ]),
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
      diagnostics: [
        {
          severity: "error",
          code: "invalid-field-name",
          message:
            'The rendered field name "user-id" for source field "userId" is not valid TypeScript property syntax.',
          path: ["root", "userId"],
          nodeKind: "field",
          source: "generator-typescript",
          evidence: {
            renderedName: "user-id",
            sourceName: "userId",
          },
        },
      ],
    });
  });

  it("returns structured failures for invalid rendered definition names", () => {
    const doc = schemaDocument(
      "Directory",
      schemaReferenceNode("user-profile"),
      {
        definitions: [
          schemaDefinition(
            "user-profile",
            schemaObjectNode([
              schemaFieldNode("id", schemaScalarNode("integer")),
            ]),
          ),
        ],
      },
    );

    expect(
      tryGenerateTypeScript(doc, {
        namingStrategy: {
          renderTypeName(name) {
            return name.source === "Directory" ? "Directory" : '"user-profile"';
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
        'The rendered type name ""user-profile"" for schema definition "user-profile" is not a valid TypeScript identifier.',
      diagnostics: [
        {
          severity: "error",
          code: "invalid-type-name",
          message:
            'The rendered type name ""user-profile"" for schema definition "user-profile" is not a valid TypeScript identifier.',
          path: ["definitions", "user-profile"],
          nodeKind: "definition",
          source: "generator-typescript",
          evidence: {
            renderedName: '"user-profile"',
            sourceName: "user-profile",
          },
        },
      ],
    });
  });

  it("returns structured failures for invalid rendered reference names", () => {
    const doc: SchemaDocument = {
      version: "0.1",
      kind: "document",
      name: identifierName("Directory"),
      definitions: [],
      root: schemaArrayNode(schemaReferenceNode("user-profile")),
    };

    expect(
      tryGenerateTypeScript(doc, {
        namingStrategy: {
          renderTypeName(name) {
            return name.source === "Directory" ? "Directory" : '"user-profile"';
          },
          renderFieldName(name) {
            return name.source;
          },
        },
      }),
    ).toEqual({
      ok: false,
      code: "invalid-reference-name",
      message:
        'The schema reference "user-profile" does not match a renderable definition.',
      diagnostics: [
        {
          severity: "error",
          code: "invalid-reference-name",
          message:
            'The schema reference "user-profile" does not match a renderable definition.',
          path: ["root", "elementType"],
          nodeKind: "reference",
          source: "generator-typescript",
          evidence: {
            referenceName: "user-profile",
          },
        },
      ],
    });
  });

  it("returns structured failures when rendered type names collide across definitions", () => {
    const doc = schemaDocument(
      "Directory",
      schemaReferenceNode("user-profile"),
      {
        definitions: [
          schemaDefinition(
            "user-profile",
            schemaObjectNode([
              schemaFieldNode("id", schemaScalarNode("integer")),
            ]),
          ),
          schemaDefinition(
            "user_profile",
            schemaObjectNode([
              schemaFieldNode("name", schemaScalarNode("string")),
            ]),
          ),
        ],
      },
    );

    expect(
      tryGenerateTypeScript(doc, {
        namingStrategy: createNamingStrategy({
          typeName: {
            style: "snake",
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
      }),
    ).toEqual({
      ok: false,
      code: "duplicate-rendered-type-name",
      message:
        'The rendered type name "user_profile" is produced by multiple schema declarations and cannot be emitted safely.',
      diagnostics: [
        {
          severity: "error",
          code: "duplicate-rendered-type-name",
          message:
            'The rendered type name "user_profile" is produced by multiple schema declarations and cannot be emitted safely.',
          path: ["definitions", "user_profile"],
          nodeKind: "definition",
          source: "generator-typescript",
          evidence: {
            renderedName: "user_profile",
            sourceNames: ["user-profile", "user_profile"],
          },
        },
      ],
    });
  });

  it("returns structured failures when the root name collides with a rendered definition name", () => {
    const doc = schemaDocument(
      "user_profile",
      schemaReferenceNode("user-profile"),
      {
        definitions: [
          schemaDefinition(
            "user-profile",
            schemaObjectNode([
              schemaFieldNode("id", schemaScalarNode("integer")),
            ]),
          ),
        ],
      },
    );

    expect(
      tryGenerateTypeScript(doc, {
        namingStrategy: createNamingStrategy({
          typeName: {
            style: "snake",
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
      }),
    ).toEqual({
      ok: false,
      code: "duplicate-rendered-type-name",
      message:
        'The rendered type name "user_profile" is produced by multiple schema declarations and cannot be emitted safely.',
      diagnostics: [
        {
          severity: "error",
          code: "duplicate-rendered-type-name",
          message:
            'The rendered type name "user_profile" is produced by multiple schema declarations and cannot be emitted safely.',
          path: ["definitions", "user-profile"],
          nodeKind: "definition",
          source: "generator-typescript",
          evidence: {
            renderedName: "user_profile",
            sourceNames: ["user-profile", "user_profile"],
          },
        },
      ],
    });
  });

  it("returns structured failures when rendered field names collide in one object", () => {
    const doc = schemaDocument(
      "UserShape",
      schemaObjectNode([
        schemaFieldNode("user-id", schemaScalarNode("integer")),
        schemaFieldNode("user_id", schemaScalarNode("string")),
      ]),
    );

    expect(
      tryGenerateTypeScript(doc, {
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
      }),
    ).toEqual({
      ok: false,
      code: "duplicate-rendered-field-name",
      message:
        'The rendered field name "userId" is produced by multiple schema fields and cannot be emitted safely.',
      diagnostics: [
        {
          severity: "error",
          code: "duplicate-rendered-field-name",
          message:
            'The rendered field name "userId" is produced by multiple schema fields and cannot be emitted safely.',
          path: ["root", "user_id"],
          nodeKind: "field",
          source: "generator-typescript",
          evidence: {
            renderedName: "userId",
            sourceNames: ["user-id", "user_id"],
          },
        },
      ],
    });
  });

  it("returns structured failures when rendered field names collide in nested objects", () => {
    const doc = schemaDocument(
      "NestedShape",
      schemaObjectNode([
        schemaFieldNode(
          "profile",
          schemaObjectNode([
            schemaFieldNode("display-name", schemaScalarNode("string")),
            schemaFieldNode("display_name", schemaScalarNode("string")),
          ]),
        ),
      ]),
    );

    expect(
      tryGenerateTypeScript(doc, {
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
      }),
    ).toEqual({
      ok: false,
      code: "duplicate-rendered-field-name",
      message:
        'The rendered field name "displayName" is produced by multiple schema fields and cannot be emitted safely.',
      diagnostics: [
        {
          severity: "error",
          code: "duplicate-rendered-field-name",
          message:
            'The rendered field name "displayName" is produced by multiple schema fields and cannot be emitted safely.',
          path: ["root", "profile", "display_name"],
          nodeKind: "field",
          source: "generator-typescript",
          evidence: {
            renderedName: "displayName",
            sourceNames: ["display-name", "display_name"],
          },
        },
      ],
    });
  });

  it("returns structured failures when identifier and quoted field forms collide", () => {
    const doc = schemaDocument(
      "QuotedCollisionShape",
      schemaObjectNode([
        schemaFieldNode("plain", schemaScalarNode("string")),
        schemaFieldNode("quoted", schemaScalarNode("string")),
      ]),
    );

    expect(
      tryGenerateTypeScript(doc, {
        namingStrategy: {
          renderTypeName(name) {
            return name.source;
          },
          renderFieldName(name) {
            return name.source === "plain" ? "userId" : '"userId"';
          },
        },
      }),
    ).toEqual({
      ok: false,
      code: "duplicate-rendered-field-name",
      message:
        'The rendered field name "userId" is produced by multiple schema fields and cannot be emitted safely.',
      diagnostics: [
        {
          severity: "error",
          code: "duplicate-rendered-field-name",
          message:
            'The rendered field name "userId" is produced by multiple schema fields and cannot be emitted safely.',
          path: ["root", "quoted"],
          nodeKind: "field",
          source: "generator-typescript",
          evidence: {
            renderedName: "userId",
            sourceNames: ["plain", "quoted"],
          },
        },
      ],
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
      schemaObjectNode([
        schemaFieldNode("userId", schemaScalarNode("integer")),
      ]),
    );

    expect(generator.generate(doc)).toEqual({
      ok: true,
      output: ["export type user_profile = {", "  user_id: number;", "};"].join(
        "\n",
      ),
      diagnostics: [integerWideningDiagnostic(["root", "userId"])],
      semanticNotes: [integerWideningSemanticNote(["root", "userId"])],
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
      schemaObjectNode([
        schemaFieldNode("userId", schemaScalarNode("integer")),
      ]),
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
      output: ["export type user_profile = {", "  user_id: number;", "};"].join(
        "\n",
      ),
      diagnostics: [integerWideningDiagnostic(["root", "userId"])],
      semanticNotes: [integerWideningSemanticNote(["root", "userId"])],
    });
  });

  it("lets the convenience function accept generator options", () => {
    const doc = schemaDocument(
      "UserProfile",
      schemaObjectNode([
        schemaFieldNode("userId", schemaScalarNode("integer")),
      ]),
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
      schemaArrayNode(
        schemaObjectNode([schemaFieldNode("id", schemaScalarNode("integer"))]),
      ),
    );

    expect(generator.generate(doc)).toEqual({
      ok: true,
      output: ["export type UserList = ({", "  id: number;", "})[];"].join(
        "\n",
      ),
      diagnostics: [integerWideningDiagnostic(["root", "elementType", "id"])],
      semanticNotes: [
        integerWideningSemanticNote(["root", "elementType", "id"]),
      ],
    });

    expect(
      generator.generate(doc, {
        arrayStyle: "generic",
      }),
    ).toEqual({
      ok: true,
      output: ["export type UserList = Array<{", "  id: number;", "}>;"].join(
        "\n",
      ),
      diagnostics: [integerWideningDiagnostic(["root", "elementType", "id"])],
      semanticNotes: [
        integerWideningSemanticNote(["root", "elementType", "id"]),
      ],
    });
  });

  it("exposes default and resolved generator options", () => {
    const resolved = resolveTypeScriptGeneratorOptions();
    const prepared = prepareTypeScriptGeneratorOptions();

    expect(
      typeof DEFAULT_TYPESCRIPT_GENERATOR_OPTIONS.namingStrategy.renderTypeName,
    ).toBe("function");
    expect(DEFAULT_TYPESCRIPT_GENERATOR_OPTIONS.rootObjectMode).toBe(
      "interface",
    );
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
