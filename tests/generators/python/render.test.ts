import { describe, expect, it } from "vitest";
import {
  schemaDocument,
  schemaFieldNode,
  schemaObjectNode,
  schemaReferenceNode,
  schemaScalarNode,
  schemaArrayNode,
  schemaRecordNode,
  schemaNullNode,
  schemaUnionNode,
  schemaDefinition,
} from "@schema-transformation-toolkit/core";
import { tryGeneratePython } from "@schema-transformation-toolkit/generator-python";

describe("Python dataclass generator", () => {
  it("renders deterministic modern dataclasses", () => {
    const address = schemaObjectNode([
      schemaFieldNode("city", schemaScalarNode("string")),
    ]);
    const user = schemaObjectNode([
      schemaFieldNode("name", schemaScalarNode("string")),
      schemaFieldNode("tags", schemaArrayNode(schemaScalarNode("string"))),
      schemaFieldNode("address", schemaReferenceNode("Address")),
      schemaFieldNode("nickname", schemaScalarNode("string"), {
        nullable: true,
      }),
    ]);
    const result = tryGeneratePython(
      schemaDocument("User", user, {
        definitions: [schemaDefinition("Address", address)],
      }),
    );
    expect(result).toEqual({
      ok: true,
      output: expect.stringContaining("class User:"),
    });
    if (!result.ok) return;
    expect(result.output).toContain("from __future__ import annotations");
    expect(result.output).toContain("tags: list[str]");
    expect(result.output).toContain("nickname: str | None");
    expect(result.output.indexOf("class Address:")).toBeLessThan(
      result.output.indexOf("class User:"),
    );
  });

  it("renders a named root reference emitted by another Shape parser", () => {
    const user = schemaObjectNode([
      schemaFieldNode("id", schemaScalarNode("integer")),
    ]);
    const result = tryGeneratePython(
      schemaDocument("Document", schemaReferenceNode("User"), {
        definitions: [schemaDefinition("User", user)],
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.output).toContain("class User:");
  });

  it("uses rootName for an inline root independently of document identity", () => {
    const result = tryGeneratePython(
      schemaDocument(
        "UserDocument",
        schemaObjectNode([schemaFieldNode("id", schemaScalarNode("integer"))]),
        { rootName: "User" },
      ),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.output).toContain("class User:");
  });

  it("rejects optional field presence instead of making it required", () => {
    const document = schemaDocument(
      "User",
      schemaObjectNode([
        schemaFieldNode("name", schemaScalarNode("string"), {
          required: false,
        }),
      ]),
    );
    expect(tryGeneratePython(document)).toMatchObject({
      ok: false,
      code: "unsupported-python-optional-field",
    });
  });

  it("renders record fields, roots, and definitions as dict aliases", () => {
    const metadata = schemaRecordNode(
      schemaScalarNode("string"),
      schemaArrayNode(schemaScalarNode("string")),
    );
    const user = schemaObjectNode([
      schemaFieldNode("metadata", schemaReferenceNode("Metadata")),
    ]);
    const result = tryGeneratePython(
      schemaDocument("User", user, {
        definitions: [schemaDefinition("Metadata", metadata)],
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain("Metadata = dict[str, list[str]]");
    expect(result.output).toContain("metadata: Metadata");

    const root = tryGeneratePython(
      schemaDocument("Metadata", metadata, { rootName: "Metadata" }),
    );
    expect(root).toMatchObject({
      ok: true,
      output: expect.stringContaining("Metadata = dict[str, list[str]]"),
    });
  });

  it("quotes references in map aliases for executable forward references", () => {
    const metadata = schemaRecordNode(
      schemaScalarNode("string"),
      schemaReferenceNode("User"),
    );
    const result = tryGeneratePython(
      schemaDocument("User", schemaReferenceNode("User"), {
        definitions: [
          schemaDefinition(
            "User",
            schemaObjectNode([
              schemaFieldNode("id", schemaScalarNode("integer")),
            ]),
          ),
          schemaDefinition("Metadata", metadata),
        ],
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain('Metadata = dict[str, "User"]');

    const recursive = schemaRecordNode(
      schemaScalarNode("string"),
      schemaReferenceNode("Metadata"),
    );
    const recursiveResult = tryGeneratePython(
      schemaDocument("Metadata", schemaReferenceNode("Metadata"), {
        definitions: [schemaDefinition("Metadata", recursive)],
        rootName: "Metadata",
      }),
    );
    expect(recursiveResult).toMatchObject({
      ok: true,
      output: expect.stringContaining('Metadata = dict[str, "Metadata"]'),
    });

    const nested = schemaRecordNode(
      schemaScalarNode("string"),
      schemaArrayNode(
        schemaUnionNode([schemaReferenceNode("User"), schemaNullNode()]),
      ),
    );
    const nestedResult = tryGeneratePython(
      schemaDocument("Metadata", nested, {
        definitions: [
          schemaDefinition(
            "User",
            schemaObjectNode([
              schemaFieldNode("id", schemaScalarNode("integer")),
            ]),
          ),
        ],
        rootName: "Metadata",
      }),
    );
    expect(nestedResult).toMatchObject({
      ok: true,
      output: expect.stringContaining(
        'Metadata = dict[str, list["User | None"]]',
      ),
    });
  });
});
