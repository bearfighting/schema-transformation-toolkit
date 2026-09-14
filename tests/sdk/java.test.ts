import { describe, expect, it } from "vitest";
import {
  convert,
  describeFormatSupport,
  listConversionRoutes,
} from "@schema-transformation-toolkit/sdk";

describe("SDK Java integration", () => {
  it("discovers Java as a builtin source and target", () => {
    const routes = listConversionRoutes();
    expect(
      routes.some(
        (route) =>
          route.sourceFormat === "java" && route.targetFormat === "typescript",
      ),
    ).toBe(true);
    expect(
      routes.some(
        (route) =>
          route.sourceFormat === "typescript" && route.targetFormat === "java",
      ),
    ).toBe(true);
    expect(describeFormatSupport("java").parser?.producesIr).toEqual(["shape"]);
  });

  it("converts Java records through Shape IR", () => {
    const result = convert({
      sourceFormat: "java",
      targetFormat: "java",
      input: "public record User(long id, String name) {}",
      name: "User",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain("public record User(");
    expect(
      result.semanticNotes?.some(
        (note) => note.code === "java-nullability-unspecified",
      ),
    ).toBe(true);
  });

  it("converts restricted Java classes and forwards class generation style", () => {
    const result = convert({
      sourceFormat: "java",
      targetFormat: "java",
      input: "public class User { private long id; public String name; }",
      name: "User",
      advanced: {
        generator: { java: { declarationStyle: "class" } },
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain("public final class User");
    expect(result.output).toContain("this.id = id;");
    expect(
      result.semanticNotes?.some((note) => note.code === "java-class-lowered"),
    ).toBe(true);
  });

  it("converts Java records to and from another Shape IR format", () => {
    const toTypeScript = convert({
      sourceFormat: "java",
      targetFormat: "typescript",
      input: "public record User(long id, String name) {}",
      name: "User",
    });
    const fromTypeScript = convert({
      sourceFormat: "typescript",
      targetFormat: "java",
      input: "export interface User { id: number; name: string }",
      name: "User",
    });

    expect(toTypeScript.ok).toBe(true);
    expect(fromTypeScript.ok).toBe(true);
    if (fromTypeScript.ok)
      expect(fromTypeScript.output).toContain("public record User(");
  });

  it("covers the remaining Java Shape IR route families", () => {
    const javaInput = "public record User(long id, String name) {}";
    const outgoing = ["json-schema", "rust", "python", "go"] as const;
    const incoming = [
      {
        sourceFormat: "rust",
        input: "struct User { id: i64, name: String }",
      },
      {
        sourceFormat: "python",
        input: "@dataclass\nclass User:\n    id: int\n    name: str",
      },
      {
        sourceFormat: "go",
        input: "package models\ntype User struct { ID int64; Name string }",
      },
      {
        sourceFormat: "json-schema",
        input: JSON.stringify({
          type: "object",
          properties: { id: { type: "integer" }, name: { type: "string" } },
          required: ["id", "name"],
        }),
      },
    ] as const;

    for (const targetFormat of outgoing) {
      const result = convert({
        sourceFormat: "java",
        targetFormat,
        input: javaInput,
        name: "User",
      });
      expect(result.ok, `java -> ${targetFormat}`).toBe(true);
    }
    for (const source of incoming) {
      const result = convert({
        sourceFormat: source.sourceFormat,
        targetFormat: "java",
        input: source.input,
        name: "User",
      });
      expect(result.ok, `${source.sourceFormat} -> java`).toBe(true);
    }
  });

  it("round-trips enums and forwards Java generator options", () => {
    const result = convert({
      sourceFormat: "java",
      targetFormat: "java",
      input: "public enum Status { ACTIVE, INACTIVE }",
      name: "Status",
      advanced: {
        generator: {
          java: { packageName: "com.example.models" },
        },
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain("package com.example.models;");
    expect(result.output).toContain("public enum Status");
    expect(
      result.semanticNotes?.some((note) => note.code === "java-enum-lowered"),
    ).toBe(true);
  });

  it.each([
    [
      "json-schema",
      JSON.stringify({
        title: "Score",
        type: "object",
        properties: { score: { type: "number", minimum: 0 } },
        required: ["score"],
      }),
      ["root", "score"],
    ],
    [
      "zod",
      'import { z } from "zod"; export const ScoreSchema = z.object({ score: z.number().min(0) });',
      ["definitions", "ScoreSchema", "score"],
    ],
    [
      "openapi",
      JSON.stringify({
        openapi: "3.1.0",
        info: { title: "Score", version: "1.0.0" },
        components: {
          schemas: {
            Score: {
              type: "object",
              properties: { score: { type: "number", minimum: 0 } },
              required: ["score"],
            },
          },
        },
      }),
      ["root", "score"],
    ],
  ] as const)(
    "reports %s constraints as Java target loss with artifacts",
    (sourceFormat, input, sourcePath) => {
      const result = convert({
        sourceFormat,
        targetFormat: "java",
        input,
        name: "Score",
        includeArtifacts: true,
      });
      expect(result.ok, JSON.stringify(result)).toBe(true);
      if (!result.ok) return;
      expect(result.artifacts?.constraints?.entries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            target: { kind: "node", path: sourcePath },
            constraints: [
              expect.objectContaining({ kind: "minimum", value: 0 }),
            ],
          }),
        ]),
      );
      expect(result.losses).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            lostCapability: "numeric-constraints",
            sourcePath,
            evidence: { constraintKind: "minimum", targetKind: "node" },
          }),
        ]),
      );
    },
  );
});
