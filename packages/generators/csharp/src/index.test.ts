import { describe, expect, it } from "vitest";
import {
  schemaArrayNode,
  schemaDefinition,
  schemaDocument,
  schemaFieldNode,
  schemaObjectNode,
  schemaReferenceNode,
  schemaScalarNode,
  schemaTupleNode,
  schemaUnknownNode,
  type SchemaDocument,
} from "@schema-transformation-toolkit/core";
import {
  csharpGeneratorCapabilities,
  csharpGeneratorDescriptor,
  generateCSharp,
  tryGenerateCSharp,
} from "./index.js";

describe("C# generator", () => {
  it("generates deterministic property-style records", () => {
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
        schemaFieldNode("tags", schemaArrayNode(schemaScalarNode("string")), {
          required: false,
        }),
      ]),
      { rootName: "User" },
    );
    const expected = `#nullable enable\n\npublic sealed record User\n{\n    public long id { get; init; }\n    public string name { get; init; }\n    public bool enabled { get; init; }\n    public double ratio { get; init; }\n    public string? email { get; init; }\n    public string[] tags { get; init; } = default!;\n}\n`;
    expect(generateCSharp(document)).toBe(expected);
    expect(generateCSharp(document)).toBe(expected);
  });

  it("renders references, recursive references, and definitions in order", () => {
    const document = schemaDocument("User", schemaReferenceNode("User"), {
      rootName: "User",
      definitions: [
        schemaDefinition(
          "User",
          schemaObjectNode([
            schemaFieldNode("address", schemaReferenceNode("Address")),
            schemaFieldNode(
              "related",
              schemaArrayNode(schemaReferenceNode("Address")),
            ),
            schemaFieldNode("manager", schemaReferenceNode("User"), {
              nullable: true,
            }),
          ]),
        ),
        schemaDefinition(
          "Address",
          schemaObjectNode([
            schemaFieldNode("city", schemaScalarNode("string")),
          ]),
        ),
      ],
    });
    expect(generateCSharp(document)).toBe(
      `#nullable enable\n\npublic sealed record User\n{\n    public Address address { get; init; }\n    public Address[] related { get; init; }\n    public User? manager { get; init; }\n}\n\npublic sealed record Address\n{\n    public string city { get; init; }\n}\n`,
    );
  });

  it("supports nullable union nodes and empty objects", () => {
    const document = schemaDocument(
      "Container",
      schemaObjectNode([
        schemaFieldNode("value", {
          kind: "union",
          members: [schemaScalarNode("integer"), { kind: "null" }],
        }),
        schemaFieldNode("empty", schemaReferenceNode("Empty")),
      ]),
      {
        definitions: [schemaDefinition("Empty", schemaObjectNode([]))],
      },
    );
    expect(generateCSharp(document)).toContain(
      "public long? @value { get; init; }",
    );
    expect(generateCSharp(document)).toContain(
      "public sealed record Empty\n{\n}",
    );
  });

  it("escapes C# keywords in declaration and property names", () => {
    const document = schemaDocument(
      "class",
      schemaObjectNode([
        schemaFieldNode("namespace", schemaScalarNode("string")),
      ]),
      { rootName: "class" },
    );
    expect(generateCSharp(document)).toContain(
      "public sealed record @class\n{\n    public string @namespace",
    );
  });

  it("uses document name when rootName is absent", () => {
    const document = schemaDocument(
      "DocumentName",
      schemaObjectNode([schemaFieldNode("value", schemaScalarNode("string"))]),
    );
    expect(generateCSharp(document)).toContain(
      "public sealed record DocumentName",
    );
  });

  it("rejects unsupported roots and nodes", () => {
    expect(
      tryGenerateCSharp(schemaDocument("Value", schemaScalarNode("string"))),
    ).toMatchObject({ ok: false, code: "unsupported-csharp-root" });
    expect(
      tryGenerateCSharp(
        schemaDocument(
          "Value",
          schemaObjectNode([schemaFieldNode("value", schemaTupleNode([]))]),
        ),
      ),
    ).toMatchObject({ ok: false, code: "unsupported-csharp-node" });
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
      tryGenerateCSharp(
        schemaDocument(
          "User",
          schemaObjectNode([schemaFieldNode("value", schemaUnknownNode())]),
        ),
      ),
    ).toMatchObject({ ok: false, code: "unsupported-csharp-node" });
  });

  it("rejects unresolved references and unsupported representations", () => {
    const unresolvedDocument = {
      version: "0.1",
      kind: "document",
      name: { source: "User", words: ["User"] },
      definitions: [],
      root: schemaObjectNode([
        schemaFieldNode("address", schemaReferenceNode("Address")),
      ]),
    } as SchemaDocument;
    expect(tryGenerateCSharp(unresolvedDocument)).toMatchObject({
      ok: false,
      code: "unresolved-csharp-reference",
    });
    expect(
      tryGenerateCSharp(
        schemaDocument(
          "User",
          schemaObjectNode([
            schemaFieldNode(
              "id",
              schemaScalarNode("integer", {
                representation: { family: "integer", widthBits: 32 },
              }),
            ),
          ]),
        ),
      ),
    ).toMatchObject({ ok: false, code: "unsupported-csharp-representation" });
  });

  it("rejects duplicate rendered declaration names", () => {
    const document = schemaDocument(
      "User",
      schemaObjectNode([schemaFieldNode("value", schemaScalarNode("string"))]),
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
    expect(tryGenerateCSharp(document)).toMatchObject({
      ok: false,
      code: "duplicate-csharp-definition",
    });
  });

  it("rejects invalid identifiers and preserves structured convenience failures", () => {
    const result = tryGenerateCSharp(
      schemaDocument(
        "User",
        schemaObjectNode([
          schemaFieldNode("not-valid", schemaScalarNode("string")),
        ]),
      ),
    );
    expect(result).toMatchObject({
      ok: false,
      code: "invalid-csharp-identifier",
    });
    expect(() =>
      generateCSharp(schemaDocument("Value", schemaScalarNode("string"))),
    ).toThrow("C# generator requires an object root.");
  });

  it("exposes a shape-only descriptor and rejects invalid bundles", () => {
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
          document: schemaDocument(
            "User",
            schemaObjectNode([
              schemaFieldNode("name", schemaScalarNode("string")),
            ]),
          ),
        },
        {},
      ),
    ).toMatchObject({ ok: true });
  });
});
