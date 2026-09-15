import { describe, expect, it } from "vitest";
import {
  schemaArrayNode,
  schemaDefinition,
  schemaDocument,
  schemaFieldNode,
  schemaLiteralNode,
  schemaObjectNode,
  schemaRecordNode,
  schemaReferenceNode,
  schemaScalarNode,
  schemaUnionNode,
  type SchemaDocument,
} from "@schema-transformation-toolkit/core";
import {
  csharpGeneratorCapabilities,
  csharpGeneratorDescriptor,
  csharpGeneratorOptionCatalog,
  generateCSharp,
  tryGenerateCSharp,
} from "./index.js";

describe("C# generator", () => {
  it("generates deterministic records with scalar and nullable fields", () => {
    const document = schemaDocument(
      "User",
      schemaObjectNode([
        schemaFieldNode("id", schemaScalarNode("integer")),
        schemaFieldNode("name", schemaScalarNode("string")),
        schemaFieldNode("enabled", schemaScalarNode("boolean")),
        schemaFieldNode("ratio", schemaScalarNode("number")),
        schemaFieldNode("email", schemaScalarNode("string"), {
          nullable: true,
        }),
        schemaFieldNode("nickname", schemaScalarNode("string"), {
          required: false,
          nullable: true,
        }),
      ]),
    );
    const expected = `#nullable enable\n\npublic sealed record User\n{\n    public required long id { get; init; }\n    public required string name { get; init; }\n    public required bool enabled { get; init; }\n    public required double ratio { get; init; }\n    public required string? email { get; init; }\n    public string? nickname { get; init; } = null;\n}\n`;
    expect(generateCSharp(document)).toBe(expected);
    expect(generateCSharp(document)).toBe(expected);
  });

  it("renders classes, namespaces, lists, maps, and deterministic imports", () => {
    const document = schemaDocument(
      "User",
      schemaObjectNode([
        schemaFieldNode("tags", schemaArrayNode(schemaScalarNode("string"))),
        schemaFieldNode(
          "groups",
          schemaRecordNode(
            schemaScalarNode("string"),
            schemaScalarNode("number"),
          ),
        ),
        schemaFieldNode(
          "matrix",
          schemaArrayNode(schemaArrayNode(schemaReferenceNode("Address"))),
        ),
      ]),
      {
        definitions: [
          schemaDefinition(
            "Address",
            schemaObjectNode([
              schemaFieldNode("city", schemaScalarNode("string")),
            ]),
          ),
        ],
      },
    );
    expect(
      generateCSharp(document, { style: "class", namespace: "Example.Models" }),
    ).toBe(
      `#nullable enable\n\nusing System.Collections.Generic;\n\nnamespace Example.Models;\n\npublic sealed class User\n{\n    public required IReadOnlyList<string> tags { get; init; }\n    public required IReadOnlyDictionary<string, double> groups { get; init; }\n    public required IReadOnlyList<IReadOnlyList<Address>> matrix { get; init; }\n}\n\npublic sealed class Address\n{\n    public required string city { get; init; }\n}\n`,
    );
  });

  it("renders enum roots and referenced enums with normalization notes", () => {
    const document = schemaDocument(
      "User",
      schemaObjectNode([
        schemaFieldNode("status", schemaReferenceNode("Status"), {
          nullable: true,
        }),
      ]),
      {
        definitions: [
          schemaDefinition(
            "Status",
            schemaUnionNode([
              schemaLiteralNode("active"),
              schemaLiteralNode("in-progress"),
              schemaLiteralNode("fooBAR"),
              schemaLiteralNode("READY"),
            ]),
          ),
        ],
      },
    );
    const result = tryGenerateCSharp(document);
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.output).toContain(
      "public enum Status\n{\n    Active,\n    InProgress,\n    FooBar,\n    Ready\n}",
    );
    expect(result.output).toContain("public required Status? status");
    expect(result.semanticNotes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "csharp-enum-member-renamed",
          source: "generator-csharp",
          layer: "target",
        }),
      ]),
    );
  });

  it("maps numeric representations safely and reports widening", () => {
    const document = schemaDocument(
      "Numbers",
      schemaObjectNode([
        schemaFieldNode(
          "small",
          schemaScalarNode("integer", {
            representation: {
              family: "integer",
              signedness: "signed",
              widthBits: 8,
            },
          }),
        ),
        ...([16, 32, 64] as const).map((widthBits) =>
          schemaFieldNode(
            `signed${widthBits}`,
            schemaScalarNode("integer", {
              representation: {
                family: "integer",
                signedness: "signed",
                widthBits,
              },
            }),
          ),
        ),
        ...([8, 16, 32] as const).map((widthBits) =>
          schemaFieldNode(
            `unsigned${widthBits}`,
            schemaScalarNode("integer", {
              representation: {
                family: "integer",
                signedness: "unsigned",
                widthBits,
              },
            }),
          ),
        ),
        schemaFieldNode(
          "unsigned",
          schemaScalarNode("integer", {
            representation: {
              family: "integer",
              signedness: "unsigned",
              widthBits: 64,
            },
          }),
        ),
        schemaFieldNode(
          "float32",
          schemaScalarNode("number", {
            representation: { family: "float", widthBits: 32 },
          }),
        ),
        schemaFieldNode(
          "float64",
          schemaScalarNode("number", {
            representation: { family: "float", widthBits: 64 },
          }),
        ),
        schemaFieldNode(
          "signedPointer",
          schemaScalarNode("integer", {
            representation: {
              family: "integer",
              signedness: "signed",
              widthBits: "pointer",
            },
          }),
        ),
        schemaFieldNode(
          "unsignedPointer",
          schemaScalarNode("integer", {
            representation: {
              family: "integer",
              signedness: "unsigned",
              widthBits: "pointer",
            },
          }),
        ),
        schemaFieldNode(
          "decimalValue",
          schemaScalarNode("number", {
            representation: { family: "decimal" },
          }),
        ),
        schemaFieldNode(
          "wide",
          schemaScalarNode("integer", {
            representation: {
              family: "integer",
              signedness: "signed",
              widthBits: 128,
            },
          }),
        ),
      ]),
    );
    const result = tryGenerateCSharp(document);
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.output).toContain("using System.Numerics;");
    expect(result.output).toContain("public required sbyte small");
    expect(result.output).toContain("public required short signed16");
    expect(result.output).toContain("public required int signed32");
    expect(result.output).toContain("public required long signed64");
    expect(result.output).toContain("public required byte unsigned8");
    expect(result.output).toContain("public required ushort unsigned16");
    expect(result.output).toContain("public required uint unsigned32");
    expect(result.output).toContain("public required ulong unsigned");
    expect(result.output).toContain("public required float float32");
    expect(result.output).toContain("public required double float64");
    expect(result.output).toContain("public required nint signedPointer");
    expect(result.output).toContain("public required nuint unsignedPointer");
    expect(result.output).toContain("public required decimal decimalValue");
    expect(result.output).toContain("public required BigInteger wide");
    expect(result.semanticNotes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "csharp-integer-representation-widened",
          kind: "widening",
        }),
      ]),
    );
  });

  it("validates options and metadata", () => {
    const document = schemaDocument("User", schemaObjectNode([]));
    expect(csharpGeneratorOptionCatalog.options).toHaveLength(2);
    expect(
      tryGenerateCSharp(document, { style: "invalid" } as never),
    ).toMatchObject({
      ok: false,
      code: "invalid-csharp-style",
    });
    expect(
      tryGenerateCSharp(document, { namespace: "Example.Bad-Name" }),
    ).toMatchObject({ ok: false, code: "invalid-csharp-namespace" });
    expect(generateCSharp(document, { namespace: "Example.record" })).toContain(
      "namespace Example.@record;",
    );
  });

  it("rejects enum collisions and unsupported enum values", () => {
    const collision = schemaDocument(
      "Status",
      schemaUnionNode([
        schemaLiteralNode("in-progress"),
        schemaLiteralNode("in_progress"),
      ]),
    );
    expect(tryGenerateCSharp(collision)).toMatchObject({
      ok: false,
      code: "csharp-enum-name-collision",
    });
    const unsupported = schemaDocument(
      "Status",
      schemaUnionNode([schemaLiteralNode("active"), schemaLiteralNode(1)]),
    );
    expect(tryGenerateCSharp(unsupported)).toMatchObject({
      ok: false,
      code: "unsupported-csharp-enum",
    });
  });

  it("falls back safely for an incompatible numeric representation", () => {
    const baseDocument = schemaDocument("Numbers", schemaObjectNode([]));
    const document = {
      ...baseDocument,
      root: schemaObjectNode([
        schemaFieldNode("value", {
          kind: "scalar",
          scalar: "number",
          representation: {
            family: "integer",
            signedness: "signed",
            widthBits: 32,
          },
        } as never),
      ]),
    } as SchemaDocument;
    const result = tryGenerateCSharp(document);
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.output).toContain("public required double @value");
    expect(result.semanticNotes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "csharp-scalar-representation-lost",
          kind: "loss",
          source: "generator-csharp",
          layer: "target",
        }),
      ]),
    );
  });

  it("rejects unsupported map/object semantics and invalid roots", () => {
    expect(
      tryGenerateCSharp(
        schemaDocument(
          "User",
          schemaObjectNode(
            [schemaFieldNode("name", schemaScalarNode("string"))],
            { additionalProperties: schemaScalarNode("string") },
          ),
        ),
      ),
    ).toMatchObject({ ok: false, code: "unsupported-csharp-node" });
    expect(
      tryGenerateCSharp(schemaDocument("Value", schemaScalarNode("string"))),
    ).toMatchObject({ ok: false, code: "unsupported-csharp-root" });
  });

  it("exposes a shape-only descriptor", () => {
    expect(csharpGeneratorDescriptor.format).toBe("csharp");
    expect(csharpGeneratorCapabilities).toMatchObject({
      target: "csharp",
      consumesIr: ["shape"],
      entryIr: ["shape"],
      supportsCapabilities: ["shape-ir"],
    });
    expect(csharpGeneratorDescriptor.generate({} as never, {})).toMatchObject({
      ok: false,
      code: "invalid-generator-input",
    });
    expect(
      csharpGeneratorDescriptor.generate(
        {
          document: schemaDocument("User", schemaObjectNode([])),
        },
        {},
      ),
    ).toMatchObject({ ok: true });
  });

  it("keeps the duplicate declaration guard", () => {
    const document = schemaDocument("User", schemaObjectNode([]), {
      definitions: [schemaDefinition("User", schemaObjectNode([]))],
    });
    expect(tryGenerateCSharp(document)).toMatchObject({
      ok: false,
      code: "duplicate-csharp-definition",
    });
  });

  it("rejects duplicate root definitions when the root is a reference", () => {
    const base = schemaDocument("Container", schemaObjectNode([]));
    const document = {
      ...base,
      root: schemaReferenceNode("User"),
      definitions: [
        schemaDefinition("User", schemaObjectNode([])),
        schemaDefinition("User", schemaObjectNode([])),
      ],
    } as SchemaDocument;
    expect(tryGenerateCSharp(document)).toMatchObject({
      ok: false,
      code: "duplicate-csharp-definition",
    });
  });

  it("supports nested nullable unions and rejects non-string maps", () => {
    const nullable = schemaDocument(
      "Container",
      schemaObjectNode([
        schemaFieldNode(
          "value",
          schemaUnionNode([schemaScalarNode("integer"), { kind: "null" }]),
        ),
      ]),
    );
    expect(generateCSharp(nullable)).toContain("public required long? @value");
    const invalidMap = {
      version: "0.1",
      kind: "document",
      name: { source: "Container", words: ["Container"] },
      definitions: [],
      root: schemaObjectNode([
        schemaFieldNode("values", {
          kind: "record",
          key: schemaScalarNode("integer"),
          value: schemaScalarNode("string"),
        }),
      ]),
    } as SchemaDocument;
    expect(tryGenerateCSharp(invalidMap)).toMatchObject({
      ok: false,
      code: "unsupported-csharp-node",
    });
  });

  it("retains the PR1 invalid-document convenience behavior", () => {
    const invalid = {
      version: "0.1",
      kind: "document",
      name: { source: "User", words: ["User"] },
      definitions: [],
      root: schemaObjectNode([]),
    } as SchemaDocument;
    expect(tryGenerateCSharp(invalid)).toMatchObject({ ok: true });
    expect(
      csharpGeneratorDescriptor.generate(
        { document: { kind: "document" } as never },
        {},
      ),
    ).toMatchObject({ ok: false, code: "invalid-generator-input" });
  });
});
