import { describe, expect, it } from "vitest";
import { typeScriptParser } from "../../packages/parsers/typescript/src/index.js";
import { jsonSchemaGenerator } from "../../packages/generators/json-schema/src/index.js";

describe("integration: typescript -> ir -> json-schema", () => {
  it("converts supported TypeScript schema declarations into JSON Schema", () => {
    const parsed = typeScriptParser.parse(
      [
        "interface User {",
        "  id: number;",
        "  name?: string | null;",
        "}",
      ].join("\n"),
      {
        entry: "User",
        name: "UserDocument",
      },
    );

    if (!parsed.ok) {
      throw new Error("Expected the TypeScript parser to succeed.");
    }

    expect(parsed.document.root).toEqual({
      kind: "reference",
      name: "User",
    });
    expect(definitionNames(parsed.document)).toEqual(["User"]);

    expect(jsonSchemaGenerator.generate(parsed.document)).toEqual({
      ok: true,
      output: {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "UserDocument",
        $defs: {
          User: {
            type: "object",
            properties: {
              id: {
                type: "number",
              },
              name: {
                oneOf: [{ type: "string" }, { type: "null" }],
              },
            },
            required: ["id"],
          },
        },
        $ref: "#/$defs/User",
      },
    });
  });

  it("renders transitive reachable definitions without emitting unused declarations", () => {
    const parsed = typeScriptParser.parse(
      [
        'type Status = "open" | "closed";',
        "type Audit = { at: string; actor: string };",
        "type User = { id: number; status: Status; audit: Audit };",
        "type Response = { users: User[] };",
        "type Unused = { debug: boolean };",
      ].join("\n"),
      {
        entry: "Response",
        name: "ResponseDocument",
      },
    );

    if (!parsed.ok) {
      throw new Error("Expected the TypeScript parser to succeed.");
    }

    expect(parsed.document.root).toEqual({
      kind: "reference",
      name: "Response",
    });
    expect(definitionNames(parsed.document)).toEqual([
      "Status",
      "Audit",
      "User",
      "Response",
    ]);

    expect(jsonSchemaGenerator.generate(parsed.document)).toEqual({
      ok: true,
      output: {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "ResponseDocument",
        $defs: {
          Status: {
            oneOf: [{ const: "open" }, { const: "closed" }],
          },
          Audit: {
            type: "object",
            properties: {
              at: {
                type: "string",
              },
              actor: {
                type: "string",
              },
            },
            required: ["at", "actor"],
          },
          User: {
            type: "object",
            properties: {
              id: {
                type: "number",
              },
              status: {
                $ref: "#/$defs/Status",
              },
              audit: {
                $ref: "#/$defs/Audit",
              },
            },
            required: ["id", "status", "audit"],
          },
          Response: {
            type: "object",
            properties: {
              users: {
                type: "array",
                items: {
                  $ref: "#/$defs/User",
                },
              },
            },
            required: ["users"],
          },
        },
        $ref: "#/$defs/Response",
      },
    });
  });

  it("renders nested record and union compositions through reusable definitions", () => {
    const parsed = typeScriptParser.parse(
      [
        "type User = { id: number; name: string };",
        "type Response = { grouped: Record<string, Array<User | null>> };",
      ].join("\n"),
      {
        entry: "Response",
        name: "ResponseDocument",
      },
    );

    if (!parsed.ok) {
      throw new Error("Expected the TypeScript parser to succeed.");
    }

    expect(parsed.document.root).toEqual({
      kind: "reference",
      name: "Response",
    });
    expect(definitionNames(parsed.document)).toEqual(["User", "Response"]);

    expect(jsonSchemaGenerator.generate(parsed.document)).toEqual({
      ok: true,
      output: {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "ResponseDocument",
        $defs: {
          User: {
            type: "object",
            properties: {
              id: {
                type: "number",
              },
              name: {
                type: "string",
              },
            },
            required: ["id", "name"],
          },
          Response: {
            type: "object",
            properties: {
              grouped: {
                type: "object",
                additionalProperties: {
                  type: "array",
                  items: {
                    oneOf: [{ $ref: "#/$defs/User" }, { type: "null" }],
                  },
                },
              },
            },
            required: ["grouped"],
          },
        },
        $ref: "#/$defs/Response",
      },
    });
  });

  it("renders enum-like literal definitions and readonly syntax through ordinary data-shape semantics", () => {
    const enumParsed = typeScriptParser.parse(
      [
        'enum Status { Open = "open", Closed = "closed" }',
        "type Response = { status: Status }",
      ].join("\n"),
      {
        entry: "Response",
        name: "ResponseDocument",
      },
    );

    if (!enumParsed.ok) {
      throw new Error("Expected the TypeScript parser to succeed.");
    }

    expect(enumParsed.document.root).toEqual({
      kind: "reference",
      name: "Response",
    });
    expect(definitionNames(enumParsed.document)).toEqual([
      "Status",
      "Response",
    ]);

    expect(jsonSchemaGenerator.generate(enumParsed.document)).toEqual({
      ok: true,
      output: {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "ResponseDocument",
        $defs: {
          Status: {
            oneOf: [{ const: "open" }, { const: "closed" }],
          },
          Response: {
            type: "object",
            properties: {
              status: {
                $ref: "#/$defs/Status",
              },
            },
            required: ["status"],
          },
        },
        $ref: "#/$defs/Response",
      },
    });

    const readonlyParsed = typeScriptParser.parse(
      [
        "interface User {",
        "  readonly id: number;",
        "  readonly tags: readonly string[];",
        "  readonly pair: readonly [number, string?];",
        "}",
      ].join("\n"),
      {
        entry: "User",
        name: "UserDocument",
      },
    );

    if (!readonlyParsed.ok) {
      throw new Error("Expected the TypeScript parser to succeed.");
    }

    expect(readonlyParsed.document.root).toEqual({
      kind: "reference",
      name: "User",
    });
    expect(definitionNames(readonlyParsed.document)).toEqual(["User"]);

    expect(jsonSchemaGenerator.generate(readonlyParsed.document)).toEqual({
      ok: true,
      output: {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "UserDocument",
        $defs: {
          User: {
            type: "object",
            properties: {
              id: {
                type: "number",
              },
              tags: {
                type: "array",
                items: {
                  type: "string",
                },
              },
              pair: {
                type: "array",
                prefixItems: [{ type: "number" }, { type: "string" }],
                minItems: 1,
                items: false,
              },
            },
            required: ["id", "tags", "pair"],
          },
        },
        $ref: "#/$defs/User",
      },
    });
  });
});

function definitionNames(document: {
  definitions: Array<{ name: { source: string } }>;
}): string[] {
  return document.definitions.map((definition) => definition.name.source);
}
