import { describe, expect, it } from "vitest";
import {
  areEquivalentSchemaNodes,
  type SchemaDefinition,
  type SchemaDocument,
} from "../../packages/core/src/index.js";
import { typeScriptGenerator } from "../../packages/generators/typescript/src/index.js";
import { typeScriptParser } from "../../packages/parsers/typescript/src/index.js";

describe("integration: typescript -> ir -> typescript", () => {
  it("round-trips the first supported object declaration slice", () => {
    const parsed = typeScriptParser.parse(
      "type User = { id: number; name?: string | null }",
      {
        entry: "User",
        name: "UserDocument",
      },
    );

    expect(parsed).toEqual({
      ok: true,
      document: parsed.ok ? parsed.document : undefined,
    });

    if (!parsed.ok) {
      throw new Error("Expected the TypeScript parser to succeed.");
    }

    expect(typeScriptGenerator.generate(parsed.document)).toEqual({
      ok: true,
      output: [
        "export interface User {",
        "  id: number;",
        "  name?: string | null;",
        "}",
        "",
        "export type UserDocument = User;",
      ].join("\n"),
    });
  });

  it("round-trips reachable named references and literal-record composition", () => {
    const parsed = typeScriptParser.parse(
      [
        'type Status = "open" | "closed";',
        "type Messages = Record<string, Status>;",
      ].join("\n"),
      {
        entry: "Messages",
        name: "MessagesDocument",
      },
    );

    if (!parsed.ok) {
      throw new Error("Expected the TypeScript parser to succeed.");
    }

    expect(typeScriptGenerator.generate(parsed.document)).toEqual({
      ok: true,
      output: [
        'export type Status = "open" | "closed";',
        "",
        "export type Messages = Record<string, Status>;",
        "",
        "export type MessagesDocument = Messages;",
      ].join("\n"),
    });
  });

  it("round-trips tuple declarations", () => {
    const parsed = typeScriptParser.parse("type Pair = [number, string]", {
      entry: "Pair",
      name: "PairDocument",
    });

    if (!parsed.ok) {
      throw new Error("Expected the TypeScript parser to succeed.");
    }

    expect(typeScriptGenerator.generate(parsed.document)).toEqual({
      ok: true,
      output: [
        "export type Pair = [number, string];",
        "",
        "export type PairDocument = Pair;",
      ].join("\n"),
    });
  });

  it("round-trips optional tuple members", () => {
    const parsed = typeScriptParser.parse(
      "type Pair = [id: number, label?: string, active: boolean]",
      {
        entry: "Pair",
        name: "PairDocument",
      },
    );

    if (!parsed.ok) {
      throw new Error("Expected the TypeScript parser to succeed.");
    }

    expect(typeScriptGenerator.generate(parsed.document)).toEqual({
      ok: true,
      output: [
        "export type Pair = [number, string?, boolean];",
        "",
        "export type PairDocument = Pair;",
      ].join("\n"),
    });
  });

  it("round-trips transitive reachable definitions without emitting unused declarations", () => {
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

    expect(typeScriptGenerator.generate(parsed.document)).toEqual({
      ok: true,
      output: [
        'export type Status = "open" | "closed";',
        "",
        "export interface Audit {",
        "  at: string;",
        "  actor: string;",
        "}",
        "",
        "export interface User {",
        "  id: number;",
        "  status: Status;",
        "  audit: Audit;",
        "}",
        "",
        "export interface Response {",
        "  users: User[];",
        "}",
        "",
        "export type ResponseDocument = Response;",
      ].join("\n"),
    });
  });

  it("round-trips nested inline object compositions without inventing extra top-level definitions", () => {
    const parsed = typeScriptParser.parse(
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
        name: "ResponseDocument",
      },
    );

    if (!parsed.ok) {
      throw new Error("Expected the TypeScript parser to succeed.");
    }

    expect(typeScriptGenerator.generate(parsed.document)).toEqual({
      ok: true,
      output: [
        "export interface Response {",
        "  users: Array<{",
        "    profile: {",
        "    name: string;",
        "    tags: [string, string?];",
        "  };",
        "    metadata: Record<string, boolean>;",
        "  }>;",
        "}",
        "",
        "export type ResponseDocument = Response;",
      ].join("\n"),
    });
  });

  it("round-trips mixed declaration styles and normalized array syntax", () => {
    const parsed = typeScriptParser.parse(
      [
        "interface Audit { at: string; actor: string }",
        'type Status = "open" | "closed";',
        "interface User { id: number; audit: Audit; status: Status }",
        "type Response = { primary: Array<User>; secondary: User[] }",
      ].join("\n"),
      {
        entry: "Response",
        name: "ResponseDocument",
      },
    );

    if (!parsed.ok) {
      throw new Error("Expected the TypeScript parser to succeed.");
    }

    expect(typeScriptGenerator.generate(parsed.document)).toEqual({
      ok: true,
      output: [
        "export interface Audit {",
        "  at: string;",
        "  actor: string;",
        "}",
        "",
        'export type Status = "open" | "closed";',
        "",
        "export interface User {",
        "  id: number;",
        "  audit: Audit;",
        "  status: Status;",
        "}",
        "",
        "export interface Response {",
        "  primary: User[];",
        "  secondary: User[];",
        "}",
        "",
        "export type ResponseDocument = Response;",
      ].join("\n"),
    });
  });

  it("round-trips literal roots and nested record-array compositions", () => {
    const literalParsed = typeScriptParser.parse("type Enabled = true", {
      entry: "Enabled",
      name: "EnabledDocument",
    });

    if (!literalParsed.ok) {
      throw new Error("Expected the TypeScript parser to succeed.");
    }

    expect(typeScriptGenerator.generate(literalParsed.document)).toEqual({
      ok: true,
      output: [
        "export type Enabled = true;",
        "",
        "export type EnabledDocument = Enabled;",
      ].join("\n"),
    });

    const nestedParsed = typeScriptParser.parse(
      [
        "type User = { id: number; name: string };",
        "type Response = { grouped: Record<string, Array<User | null>> };",
      ].join("\n"),
      {
        entry: "Response",
        name: "ResponseDocument",
      },
    );

    if (!nestedParsed.ok) {
      throw new Error("Expected the TypeScript parser to succeed.");
    }

    expect(typeScriptGenerator.generate(nestedParsed.document)).toEqual({
      ok: true,
      output: [
        "export interface User {",
        "  id: number;",
        "  name: string;",
        "}",
        "",
        "export interface Response {",
        "  grouped: Record<string, Array<User | null>>;",
        "}",
        "",
        "export type ResponseDocument = Response;",
      ].join("\n"),
    });
  });

  it("round-trips enum declarations as literal unions", () => {
    const parsed = typeScriptParser.parse(
      [
        'enum Status { Open = "open", Closed = "closed" }',
        "type Response = { status: Status }",
      ].join("\n"),
      {
        entry: "Response",
        name: "ResponseDocument",
      },
    );

    if (!parsed.ok) {
      throw new Error("Expected the TypeScript parser to succeed.");
    }

    expect(typeScriptGenerator.generate(parsed.document)).toEqual({
      ok: true,
      output: [
        'export type Status = "open" | "closed";',
        "",
        "export interface Response {",
        "  status: Status;",
        "}",
        "",
        "export type ResponseDocument = Response;",
      ].join("\n"),
    });
  });

  it("round-trips numeric enum declarations as numeric literal unions", () => {
    const parsed = typeScriptParser.parse(
      "enum Level { Low, Medium = 3, High }",
      {
        entry: "Level",
        name: "LevelDocument",
      },
    );

    if (!parsed.ok) {
      throw new Error("Expected the TypeScript parser to succeed.");
    }

    expect(typeScriptGenerator.generate(parsed.document)).toEqual({
      ok: true,
      output: [
        "export type Level = 0 | 3 | 4;",
        "",
        "export type LevelDocument = Level;",
      ].join("\n"),
    });
  });

  it("round-trips enum member references as normalized literal unions", () => {
    const parsed = typeScriptParser.parse(
      "enum Level { Low = 1, SameLow = Low, AlsoLow = Level.Low, High = 3 }",
      {
        entry: "Level",
        name: "LevelDocument",
      },
    );

    if (!parsed.ok) {
      throw new Error("Expected the TypeScript parser to succeed.");
    }

    expect(typeScriptGenerator.generate(parsed.document)).toEqual({
      ok: true,
      output: [
        "export type Level = 1 | 3;",
        "",
        "export type LevelDocument = Level;",
      ].join("\n"),
    });
  });

  it("round-trips readonly syntax as ordinary data-shape semantics", () => {
    const parsed = typeScriptParser.parse(
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

    if (!parsed.ok) {
      throw new Error("Expected the TypeScript parser to succeed.");
    }

    expect(typeScriptGenerator.generate(parsed.document)).toEqual({
      ok: true,
      output: [
        "export interface User {",
        "  id: number;",
        "  tags: string[];",
        "  pair: [number, string?];",
        "}",
        "",
        "export type UserDocument = User;",
      ].join("\n"),
    });
  });

  it("keeps a semantic fixpoint across parse -> generate -> parse for representative supported cases", () => {
    const cases = [
      {
        source: "type User = { id: number; name?: string | null }",
        entry: "User",
        name: "UserDocument",
      },
      {
        source: [
          'enum Status { Open = "open", Closed = "closed" }',
          "type Response = { status: Status }",
        ].join("\n"),
        entry: "Response",
        name: "ResponseDocument",
      },
      {
        source: [
          "interface User {",
          "  readonly id: number;",
          "  readonly tags: readonly string[];",
          "  readonly pair: readonly [number, string?];",
          "}",
        ].join("\n"),
        entry: "User",
        name: "UserDocument",
      },
      {
        source: [
          "type User = { id: number; name: string };",
          "type Response = { grouped: Record<string, Array<User | null>> };",
        ].join("\n"),
        entry: "Response",
        name: "ResponseDocument",
      },
      {
        source:
          "enum Level { Low = 1, SameLow = Low, AlsoLow = Level.Low, High = 3 }",
        entry: "Level",
        name: "LevelDocument",
      },
    ] as const;

    for (const testCase of cases) {
      const firstParsed = typeScriptParser.parse(testCase.source, {
        entry: testCase.entry,
        name: testCase.name,
      });

      if (!firstParsed.ok) {
        throw new Error(
          `Expected the first parse to succeed for entry "${testCase.entry}".`,
        );
      }

      const firstGenerated = typeScriptGenerator.generate(firstParsed.document);

      if (!firstGenerated.ok) {
        throw new Error(
          `Expected the first generate to succeed for entry "${testCase.entry}".`,
        );
      }

      const secondParsed = typeScriptParser.parse(firstGenerated.output, {
        entry: testCase.entry,
        name: testCase.name,
      });

      if (!secondParsed.ok) {
        throw new Error(
          `Expected the reparsed generated output to succeed for entry "${testCase.entry}".`,
        );
      }

      assertEquivalentSchemaDocuments(
        firstParsed.document,
        secondParsed.document,
      );

      const secondGenerated = typeScriptGenerator.generate(
        secondParsed.document,
      );

      if (!secondGenerated.ok) {
        throw new Error(
          `Expected the second generate to succeed for entry "${testCase.entry}".`,
        );
      }

      expect(secondGenerated.output).toBe(firstGenerated.output);
    }
  });
});

function assertEquivalentSchemaDocuments(
  left: SchemaDocument,
  right: SchemaDocument,
): void {
  expect(left.name.source).toBe(right.name.source);
  expect(left.version).toBe(right.version);
  expect(areEquivalentSchemaNodes(left.root, right.root)).toBe(true);

  const leftDefinitions = definitionsByName(left.definitions);
  const rightDefinitions = definitionsByName(right.definitions);

  expect(Array.from(leftDefinitions.keys()).sort()).toEqual(
    Array.from(rightDefinitions.keys()).sort(),
  );

  for (const [name, definition] of leftDefinitions) {
    const other = rightDefinitions.get(name);

    expect(
      other,
      `Missing definition "${name}" in reparsed document.`,
    ).toBeDefined();

    if (!other) {
      continue;
    }

    expect(areEquivalentSchemaNodes(definition.type, other.type)).toBe(true);
  }
}

function definitionsByName(
  definitions: SchemaDefinition[],
): Map<string, SchemaDefinition> {
  return new Map(
    definitions.map((definition) => [definition.name.source, definition]),
  );
}
