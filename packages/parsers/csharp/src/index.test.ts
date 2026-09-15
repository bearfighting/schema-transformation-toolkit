import { describe, expect, it } from "vitest";
import {
  csharpParserCapabilities,
  csharpParserDescriptor,
  csharpParserOptionCatalog,
  parseCSharp,
  tryParseCSharp,
} from "./index.js";

describe("C# parser", () => {
  it("maps a positional record and preserves the document name", () => {
    const result = tryParseCSharp(
      "public record User(string Name, int Age, string? Email);",
      { name: "models.cs" },
    );
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.document).toMatchObject({
      name: { source: "models.cs" },
      rootName: { source: "User" },
      root: {
        kind: "object",
        fields: [
          {
            name: { source: "Name" },
            required: true,
            nullable: false,
            type: { kind: "scalar", scalar: "string" },
          },
          {
            name: { source: "Age" },
            required: true,
            nullable: false,
            type: { kind: "scalar", scalar: "integer" },
          },
          {
            name: { source: "Email" },
            required: true,
            nullable: true,
            type: { kind: "scalar", scalar: "string" },
          },
        ],
      },
    });
  });

  it("maps a semicolon-terminated empty record to an empty object", () => {
    const result = tryParseCSharp("public record User;");
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.document.root).toMatchObject({ kind: "object", fields: [] });
  });

  it("maps property-style records, namespace, using, and accessors", () => {
    const result = tryParseCSharp(`using System.Collections.Generic;
namespace Example.Models;
public sealed record User
{
    public required string Name { get; init; }
    public int Age { get; set; }
    public string? Nickname { get; init; }
}`);
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.document.root).toMatchObject({
      kind: "object",
      fields: [
        { name: { source: "Name" }, required: true, nullable: false },
        { name: { source: "Age" }, required: false, nullable: false },
        { name: { source: "Nickname" }, required: false, nullable: true },
      ],
    });
  });

  it("maps classes with required and nullable properties", () => {
    const result = tryParseCSharp(`internal sealed class User
{
    public required string Name { get; init; }
    public int Age { get; set; }
    public string? Email { get; init; }
}`);
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.document.root).toMatchObject({
      kind: "object",
      fields: [
        { name: { source: "Name" }, required: true, nullable: false },
        { name: { source: "Age" }, required: false, nullable: false },
        { name: { source: "Email" }, required: false, nullable: true },
      ],
    });
  });

  it("supports empty classes and mixed declarations", () => {
    const result = tryParseCSharp(
      `public class Empty { }
record User(Status Status);
    enum Status { Active, Disabled }`,
      { entry: "User" },
    );
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.document.rootName).toMatchObject({ source: "User" });
    expect(result.document.definitions).toHaveLength(2);
    expect(result.document.definitions[1]).toMatchObject({
      name: { source: "Status" },
      type: { kind: "union" },
    });
    const empty = tryParseCSharp("public class Empty { }");
    expect(empty).toMatchObject({ ok: true });
    if (empty.ok) expect(empty.document.root).toMatchObject({ fields: [] });
  });

  it("classifies declaration, constructor, and field attributes", () => {
    expect(
      tryParseCSharp("[Serializable] public class User { }"),
    ).toMatchObject({
      ok: false,
      code: "unsupported-csharp-attribute",
    });
    expect(
      tryParseCSharp("public class User { public User() { } }"),
    ).toMatchObject({ ok: false, code: "unsupported-csharp-member" });
    expect(
      tryParseCSharp("public class User { private User() { } }"),
    ).toMatchObject({ ok: false, code: "unsupported-csharp-member" });
    expect(
      tryParseCSharp(
        "public class User { public string this[int index] { get; } }",
      ),
    ).toMatchObject({ ok: false, code: "unsupported-csharp-member" });
    expect(
      tryParseCSharp('public class User { public string Name = "x"; }'),
    ).toMatchObject({ ok: false, code: "unsupported-csharp-member" });
  });

  it("returns a structured failure for invalid options", () => {
    expect(tryParseCSharp("public record User;", { name: "" })).toMatchObject({
      ok: false,
      code: "invalid-csharp-options",
      diagnostics: [{ source: "parser-csharp" }],
    });
  });

  it("maps enum definitions and enum roots", () => {
    const referenced = tryParseCSharp(`record User(Status? Status);
public enum Status { Active, @class, Disabled, }`);
    expect(referenced).toMatchObject({ ok: true });
    if (!referenced.ok) return;
    expect(referenced.document).toMatchObject({
      rootName: { source: "User" },
      root: { kind: "object" },
      definitions: [
        {
          name: { source: "Status" },
          type: {
            kind: "union",
            members: [
              { kind: "literal", value: "Active" },
              { kind: "literal", value: "class" },
              { kind: "literal", value: "Disabled" },
            ],
          },
        },
      ],
    });
    const root = tryParseCSharp("public enum Status { Active, Disabled, }");
    expect(root).toMatchObject({ ok: true });
    if (root.ok) expect(root.document.root).toMatchObject({ kind: "union" });
  });

  it("maps arrays, lists, dictionaries, nested nullability, and numeric hints", () => {
    const result = tryParseCSharp(
      `public record Values(
      byte ByteValue,
      uint UIntValue,
      nint NativeValue,
      float Ratio,
      decimal Amount,
      string?[] Names,
      List<int?> Items,
      IReadOnlyList<User> Users,
      IEnumerable<string> Values,
      Dictionary<string, User> ByName,
      IReadOnlyDictionary<string, int> Counts
    );
    public record User(string Id);`,
      { entry: "Values" },
    );
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.document.root).toMatchObject({ kind: "object" });
    expect(result.document).toMatchObject({ rootName: { source: "Values" } });
    expect(result.document.definitions).toHaveLength(1);
    expect(result.document.root).toMatchObject({
      kind: "object",
      fields: [
        {
          type: {
            kind: "scalar",
            representation: {
              family: "integer",
              signedness: "unsigned",
              widthBits: 8,
            },
          },
        },
        {
          type: {
            kind: "scalar",
            representation: {
              family: "integer",
              signedness: "unsigned",
              widthBits: 32,
            },
          },
        },
        {
          type: {
            kind: "scalar",
            representation: {
              family: "integer",
              signedness: "signed",
              widthBits: "pointer",
            },
          },
        },
        {
          type: {
            kind: "scalar",
            representation: { family: "float", widthBits: 32 },
          },
        },
        { type: { kind: "scalar", representation: { family: "decimal" } } },
        { type: { kind: "array", elementType: { kind: "union" } } },
        { type: { kind: "array", elementType: { kind: "union" } } },
        {
          type: {
            kind: "array",
            elementType: { kind: "reference", name: "User" },
          },
        },
        {
          type: {
            kind: "array",
            elementType: { kind: "scalar", scalar: "string" },
          },
        },
        {
          type: {
            kind: "record",
            key: { scalar: "string" },
            value: { kind: "reference", name: "User" },
          },
        },
        {
          type: {
            kind: "record",
            value: { kind: "scalar", scalar: "integer" },
          },
        },
      ],
    });
  });

  it("infers a unique graph root and supports forward and recursive references", () => {
    const source = `public record User(string Name, Address? Address, User? Parent);
public record Address(string City);`;
    const first = tryParseCSharp(source);
    const second = tryParseCSharp(source);
    expect(first).toEqual(second);
    expect(first).toMatchObject({ ok: true });
    if (!first.ok) return;
    expect(first.document).toMatchObject({
      rootName: { source: "User" },
      root: { kind: "reference", name: "User" },
      definitions: [
        { name: { source: "User" } },
        { name: { source: "Address" } },
      ],
    });
  });

  it("uses entry for an ambiguous graph and preserves inline root otherwise", () => {
    expect(
      tryParseCSharp("record A(string Value); record B(string Value);"),
    ).toMatchObject({
      ok: false,
      code: "ambiguous-csharp-root",
    });
    const result = tryParseCSharp("record A(string Value); record B(A Item);", {
      entry: "B",
    });
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.document.root).toMatchObject({ kind: "object" });
    expect(result.document.definitions).toHaveLength(1);
    expect(result.document.rootName).toMatchObject({ source: "B" });
  });

  it("returns structured syntax, semantic, option, and descriptor failures", () => {
    for (const [source, code] of [
      ["", "invalid-csharp-data-model"],
      ["public record User(string Name", "invalid-csharp-syntax"],
      ["public record User(DateTime Created);", "unsupported-csharp-type"],
      [
        "public record User(Dictionary<int, string> Values);",
        "unsupported-csharp-map-key",
      ],
      ["public record User(Missing Value);", "unknown-csharp-reference"],
      [
        "namespace Example { public record User(string Name); }",
        "unsupported-csharp-namespace",
      ],
      [
        "global using System; record User(string Name);",
        "unsupported-csharp-feature",
      ],
      [
        "public record User { private string Name { get; set; } }",
        "unsupported-csharp-property",
      ],
      [
        "public record User { string Name { get; init; } }",
        "unsupported-csharp-property",
      ],
      [
        "public class User { public string Name; }",
        "unsupported-csharp-member",
      ],
      [
        "public class User { public void Save() { } }",
        "unsupported-csharp-member",
      ],
      [
        "public class User : Base { public string Name { get; init; } }",
        "unsupported-csharp-inheritance",
      ],
      [
        "public record User { [Required] public string Name { get; init; } }",
        "unsupported-csharp-attribute",
      ],
      ["public enum Status { }", "empty-csharp-enum"],
      ["public enum Status { Active = 1 }", "unsupported-csharp-enum-member"],
      ["public enum Status { Active, Active }", "duplicate-csharp-enum-member"],
      ["public enum Status : int { Active }", "unsupported-csharp-enum"],
      ["public enum Status { Active { } }", "unsupported-csharp-enum-member"],
    ] as const) {
      const result = tryParseCSharp(source);
      expect(result).toMatchObject({ ok: false, code });
      if (!result.ok)
        expect(result.diagnostics?.[0]?.source).toBe("parser-csharp");
      if (!result.ok && result.diagnostics?.[0]?.evidence)
        expect(result.diagnostics[0].evidence).toMatchObject({
          position: { line: expect.any(Number), column: expect.any(Number) },
        });
    }
    expect(
      tryParseCSharp("record User(string Name);", { name: "  " }),
    ).toMatchObject({ ok: false });
    expect(
      tryParseCSharp("record User(string Name);", { entry: "Missing" }),
    ).toMatchObject({ ok: false, code: "invalid-csharp-entry" });
    expect(() => parseCSharp("record User(string Name", {})).toThrow();
    expect(csharpParserDescriptor.format).toBe("csharp");
    expect(csharpParserCapabilities).toMatchObject({
      producesIr: ["shape"],
      capabilities: ["shape-ir"],
    });
    expect(csharpParserOptionCatalog.options[0]?.key).toBe("entry");
    expect(
      csharpParserDescriptor.parse("record User(string Name);", {
        name: "User.cs",
      }),
    ).toMatchObject({ ok: true });
  });

  it("preserves every supported numeric representation", () => {
    const result = tryParseCSharp(
      "record Numbers(sbyte A, short B, ushort C, int D, long E, ulong F, nuint G, double H);",
    );
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.document.root).toMatchObject({
      fields: [
        { type: { representation: { signedness: "signed", widthBits: 8 } } },
        { type: { representation: { signedness: "signed", widthBits: 16 } } },
        { type: { representation: { signedness: "unsigned", widthBits: 16 } } },
        { type: { representation: { signedness: "signed", widthBits: 32 } } },
        { type: { representation: { signedness: "signed", widthBits: 64 } } },
        { type: { representation: { signedness: "unsigned", widthBits: 64 } } },
        {
          type: {
            representation: { signedness: "unsigned", widthBits: "pointer" },
          },
        },
        { type: { representation: { family: "float", widthBits: 64 } } },
      ],
    });
  });

  it("accepts the String alias as a dictionary key", () => {
    const result = tryParseCSharp(
      "record User(Dictionary<String, string> Values);",
    );
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.document.root).toMatchObject({
      fields: [{ type: { kind: "record", key: { scalar: "string" } } }],
    });
  });

  it("requires C# keywords to be escaped in names", () => {
    expect(tryParseCSharp("record User(string class);")).toMatchObject({
      ok: false,
      code: "invalid-csharp-syntax",
    });
    expect(tryParseCSharp("record @record(string @class);")).toMatchObject({
      ok: true,
    });
    expect(
      tryParseCSharp("record User { public string @value { get; init; } }"),
    ).toMatchObject({
      ok: true,
    });
  });

  it("rejects duplicates, unsupported declarations, and invalid roots", () => {
    expect(
      tryParseCSharp("record User(string A); record User(string B);"),
    ).toMatchObject({ ok: false, code: "duplicate-csharp-definition" });
    expect(tryParseCSharp("record User(string A, string A);")).toMatchObject({
      ok: false,
      code: "duplicate-csharp-field",
    });
    expect(
      tryParseCSharp("public partial record User(string Name);"),
    ).toMatchObject({ ok: false, code: "unsupported-csharp-modifier" });
    expect(
      tryParseCSharp("public public record User(string Name);"),
    ).toMatchObject({ ok: false, code: "invalid-csharp-syntax" });
    expect(
      tryParseCSharp("sealed sealed record User(string Name);"),
    ).toMatchObject({ ok: false, code: "invalid-csharp-syntax" });
    expect(tryParseCSharp("record User<T>(T Value);")).toMatchObject({
      ok: false,
      code: "unsupported-csharp-feature",
    });
    expect(tryParseCSharp("record User(string[,] Values);")).toMatchObject({
      ok: false,
      code: "unsupported-csharp-type",
    });
    expect(
      tryParseCSharp("record A(B Value); record B(A Value);"),
    ).toMatchObject({ ok: false, code: "missing-csharp-root" });
    expect(
      tryParseCSharp("record User(string Name); namespace Example;"),
    ).toMatchObject({ ok: false, code: "invalid-csharp-syntax" });
    expect(
      tryParseCSharp(
        "namespace Example; using System; record User(string Name);",
      ),
    ).toMatchObject({ ok: false, code: "invalid-csharp-syntax" });
  });
});
