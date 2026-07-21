import { describe, expect, it } from "vitest";
import {
  areEquivalentSchemaNodes,
  type SchemaDocument,
} from "../../packages/core/src/index.js";
import { typeScriptGenerator } from "../../packages/generators/typescript/src/index.js";
import { typeScriptParser } from "../../packages/parsers/typescript/src/index.js";
import { expectOk } from "../helpers/result-assertions.js";
import { definitionsByName } from "../helpers/schema-document-assertions.js";

describe("integration: typescript -> ir -> typescript", () => {
  it("round-trips the first supported object declaration slice", () => {
    const parsed = typeScriptParser.parse(
      "type User = { id: number; name?: string | null }",
      {
        entry: "User",
        name: "UserDocument",
      },
    );

    expectOk(parsed, "Expected the TypeScript parser to succeed.");

    expect(parsed.document.name.source).toBe("UserDocument");
    expect(parsed.document.root.kind).toBe("reference");
    const result = typeScriptGenerator.generate(parsed.document);

    expect(result).toMatchObject({
      ok: true,
      output: expect.stringContaining("export interface User {"),
    });

    expectOk(result, "Expected the TypeScript generator to succeed.");
    expect(result.output).toContain("name?: string | null;");
    expect(result.output).toContain("export type UserDocument = User;");
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

    expectOk(parsed, "Expected the TypeScript parser to succeed.");

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

    expectOk(parsed, "Expected the TypeScript parser to succeed.");
    const result = typeScriptGenerator.generate(parsed.document);

    expect(result).toMatchObject({
      ok: true,
      output: expect.stringContaining(
        "export type Pair = [number, string];",
      ),
    });

    expectOk(result, "Expected the TypeScript generator to succeed.");
    expect(result.output).toContain("export type PairDocument = Pair;");
  });

  it("round-trips optional tuple members", () => {
    const parsed = typeScriptParser.parse(
      "type Pair = [id: number, label?: string, active: boolean]",
      {
        entry: "Pair",
        name: "PairDocument",
      },
    );

    expectOk(parsed, "Expected the TypeScript parser to succeed.");
    const result = typeScriptGenerator.generate(parsed.document);

    expect(result).toMatchObject({
      ok: true,
      output: expect.stringContaining(
        "export type Pair = [number, string?, boolean];",
      ),
    });

    expectOk(result, "Expected the TypeScript generator to succeed.");
    expect(result.output).toContain("export type PairDocument = Pair;");
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

    expectOk(parsed, "Expected the TypeScript parser to succeed.");

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

    expectOk(parsed, "Expected the TypeScript parser to succeed.");
    const result = typeScriptGenerator.generate(parsed.document);

    expect(result).toMatchObject({
      ok: true,
      output: expect.stringContaining("export interface Response {"),
    });

    expectOk(result, "Expected the TypeScript generator to succeed.");
    expect(result.output).toContain("profile: {");
    expect(result.output).toContain("tags: [string, string?];");
    expect(result.output).toContain("metadata: Record<string, boolean>;");
    expect(result.output).toContain("export type ResponseDocument = Response;");
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

    expectOk(parsed, "Expected the TypeScript parser to succeed.");
    const result = typeScriptGenerator.generate(parsed.document);

    expect(result).toMatchObject({
      ok: true,
      output: expect.stringContaining("export interface Response {"),
    });

    expectOk(result, "Expected the TypeScript generator to succeed.");
    expect(result.output).toContain("export interface Audit {");
    expect(result.output).toContain('export type Status = "open" | "closed";');
    expect(result.output).toContain("primary: User[];");
    expect(result.output).toContain("secondary: User[];");
    expect(result.output).toContain("export type ResponseDocument = Response;");
  });

  it("round-trips literal roots and nested record-array compositions", () => {
    const literalParsed = typeScriptParser.parse("type Enabled = true", {
      entry: "Enabled",
      name: "EnabledDocument",
    });

    expectOk(literalParsed, "Expected the TypeScript parser to succeed.");
    const literalResult = typeScriptGenerator.generate(literalParsed.document);

    expect(literalResult).toMatchObject({
      ok: true,
      output: expect.stringContaining("export type Enabled = true;"),
    });

    expectOk(literalResult, "Expected the TypeScript generator to succeed.");
    expect(literalResult.output).toContain(
      "export type EnabledDocument = Enabled;",
    );

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

    expectOk(nestedParsed, "Expected the TypeScript parser to succeed.");
    const nestedResult = typeScriptGenerator.generate(nestedParsed.document);

    expect(nestedResult).toMatchObject({
      ok: true,
      output: expect.stringContaining("export interface Response {"),
    });

    expectOk(
      nestedResult,
      "Expected the TypeScript generator to succeed for nested record arrays.",
    );
    expect(nestedResult.output).toContain("export interface User {");
    expect(nestedResult.output).toContain(
      "grouped: Record<string, Array<User | null>>;",
    );
    expect(nestedResult.output).toContain(
      "export type ResponseDocument = Response;",
    );
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

    expectOk(parsed, "Expected the TypeScript parser to succeed.");
    const result = typeScriptGenerator.generate(parsed.document);

    expect(result).toMatchObject({
      ok: true,
      output: expect.stringContaining('export type Status = "open" | "closed";'),
    });

    expectOk(result, "Expected the TypeScript generator to succeed.");
    expect(result.output).toContain("status: Status;");
    expect(result.output).toContain("export type ResponseDocument = Response;");
  });

  it("round-trips numeric enum declarations as numeric literal unions", () => {
    const parsed = typeScriptParser.parse(
      "enum Level { Low, Medium = 3, High }",
      {
        entry: "Level",
        name: "LevelDocument",
      },
    );

    expectOk(parsed, "Expected the TypeScript parser to succeed.");
    const result = typeScriptGenerator.generate(parsed.document);

    expect(result).toMatchObject({
      ok: true,
      output: expect.stringContaining("export type Level = 0 | 3 | 4;"),
    });

    expectOk(result, "Expected the TypeScript generator to succeed.");
    expect(result.output).toContain("export type LevelDocument = Level;");
  });

  it("round-trips enum member references as normalized literal unions", () => {
    const parsed = typeScriptParser.parse(
      "enum Level { Low = 1, SameLow = Low, AlsoLow = Level.Low, High = 3 }",
      {
        entry: "Level",
        name: "LevelDocument",
      },
    );

    expectOk(parsed, "Expected the TypeScript parser to succeed.");
    const result = typeScriptGenerator.generate(parsed.document);

    expect(result).toMatchObject({
      ok: true,
      output: expect.stringContaining("export type Level = 1 | 3;"),
    });

    expectOk(result, "Expected the TypeScript generator to succeed.");
    expect(result.output).toContain("export type LevelDocument = Level;");
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

    expectOk(parsed, "Expected the TypeScript parser to succeed.");
    const result = typeScriptGenerator.generate(parsed.document);

    expect(result).toMatchObject({
      ok: true,
      output: expect.stringContaining("export interface User {"),
    });

    expectOk(result, "Expected the TypeScript generator to succeed.");
    expect(result.output).toContain("tags: string[];");
    expect(result.output).toContain("pair: [number, string?];");
    expect(result.output).toContain("export type UserDocument = User;");
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

      expectOk(
        firstParsed,
        `Expected the first parse to succeed for entry "${testCase.entry}".`,
      );

      const firstGenerated = typeScriptGenerator.generate(firstParsed.document);

      expectOk(
        firstGenerated,
        `Expected the first generate to succeed for entry "${testCase.entry}".`,
      );

      const secondParsed = typeScriptParser.parse(firstGenerated.output, {
        entry: testCase.entry,
        name: testCase.name,
      });

      expectOk(
        secondParsed,
        `Expected the reparsed generated output to succeed for entry "${testCase.entry}".`,
      );

      assertEquivalentSchemaDocuments(
        firstParsed.document,
        secondParsed.document,
      );

      const secondGenerated = typeScriptGenerator.generate(
        secondParsed.document,
      );

      expectOk(
        secondGenerated,
        `Expected the second generate to succeed for entry "${testCase.entry}".`,
      );

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
