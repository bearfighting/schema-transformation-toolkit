import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { convert } from "../../packages/sdk/src/index.js";
import { tryGenerateRust } from "../../packages/generators/rust/src/index.js";
import { tryParseRust } from "../../packages/parsers/rust/src/index.js";

describe("integration: Rust routes", () => {
  it("converts Rust structs to TypeScript and JSON Schema", () => {
    for (const targetFormat of ["typescript", "json-schema"] as const) {
      const result = convert({
        sourceFormat: "rust",
        targetFormat,
        input: "struct User { id: u32, email: Option<String> }",
      });
      expect(result.ok, JSON.stringify(result)).toBe(true);
      if (!result.ok) continue;
      expect(result.output).toBeTruthy();
    }
  });

  it("converts schema-oriented TypeScript to Rust", () => {
    const result = convert({
      sourceFormat: "typescript",
      targetFormat: "rust",
      input: "interface User { id: number; name?: string | null }",
    });
    expect(result.ok, JSON.stringify(result)).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain("pub struct User");
    expect(result.output).toContain("Option<String>");
  });

  it("converts Rust enums and maps across schema-oriented targets", () => {
    const input = `
      use std::collections::HashMap;
      enum Status { Pending, Active }
      struct User { status: Status, labels: HashMap<String, String> }
    `;
    for (const targetFormat of [
      "typescript",
      "json-schema",
      "zod",
      "openapi",
    ] as const) {
      const result = convert({
        sourceFormat: "rust",
        targetFormat,
        input,
        advanced: { parser: { rust: { entry: "User" } } },
      });
      expect(result.ok, JSON.stringify(result)).toBe(true);
      if (result.ok) expect(result.output).toBeTruthy();
    }
  });

  it("round-trips Rust recursive models through the Rust generator", () => {
    const result = convert({
      sourceFormat: "rust",
      targetFormat: "rust",
      input: "struct Node { value: String, next: Option<Box<Node>> }",
    });
    expect(result.ok, JSON.stringify(result)).toBe(true);
    if (!result.ok) return;
    expect(result.output).not.toContain("std::collections");
    expect(result.output).toContain("next: Option<Box<Node>>");
  });

  it("preserves enum and map semantics across a Rust IR round trip", () => {
    const first = tryParseRust(
      "use std::collections::BTreeMap; enum Status { Pending, Active } struct User { status: Status, labels: BTreeMap<String, String> }",
      { entry: "User", name: "User" },
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const generated = tryGenerateRust(
      first.document,
      {},
      first.artifacts.constraints,
    );
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;
    const second = tryParseRust(generated.output, {
      entry: "User",
      name: "User",
    });
    expect(second.ok, JSON.stringify(second)).toBe(true);
    if (!second.ok) return;
    expect(second.document).toEqual(first.document);
    expect(second.artifacts.constraints).toEqual(first.artifacts.constraints);
  });

  it("compiles representative generated Rust with rustc", () => {
    const parsed = tryParseRust(
      `
        use std::collections::HashMap;
        enum Status { Pending, Active }
        struct Node { value: i64, next: Option<Box<Node>> }
        struct Left { right: Right }
        struct Right { left: Left }
        struct Model {
          status: Status,
          labels: HashMap<String, Option<Node>>,
          values: Vec<u32>,
        }
      `,
      { entry: "Model", name: "Model" },
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const generated = tryGenerateRust(
      parsed.document,
      {},
      parsed.artifacts.constraints,
    );
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;

    const directory = mkdtempSync(join(tmpdir(), "schema-toolkit-rust-"));
    const sourcePath = join(directory, "model.rs");
    const outputPath = join(directory, "libmodel.rlib");
    writeFileSync(sourcePath, generated.output, "utf8");
    try {
      const compilation = spawnSync(
        "rustc",
        [
          "--crate-type",
          "lib",
          "--edition",
          "2021",
          sourcePath,
          "-o",
          outputPath,
        ],
        { encoding: "utf8" },
      );
      if (compilation.status !== 0) {
        throw new Error(
          `Generated Rust failed to compile (status ${String(compilation.status)}).\n${readFileSync(sourcePath, "utf8")}\n${compilation.stderr || compilation.stdout || compilation.error?.message || "unknown rustc failure"}`,
        );
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }, 30_000);
});
