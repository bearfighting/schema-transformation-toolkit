import { describe, expect, it } from "vitest";
import {
  convert,
  describeFormatSupport,
  listSourceFormatSupports,
  listTargetFormatSupports,
} from "@schema-transformation-toolkit/sdk";

describe("Python SDK integration", () => {
  it("discovers Python as a builtin source and target", () => {
    expect(
      listSourceFormatSupports().some((item) => item.format === "python"),
    ).toBe(true);
    expect(
      listTargetFormatSupports().some((item) => item.format === "python"),
    ).toBe(true);
    const support = describeFormatSupport("python");
    expect(support.parser?.capabilities).toContain("shape-ir");
    expect(
      support.notableLimitations.some((item) =>
        item.includes("quoted forward references"),
      ),
    ).toBe(true);
    expect(support.experimentalAreas).not.toContain("recursive dataclasses");
  });

  it("converts Python dataclasses through the shared pipeline", () => {
    const input =
      "@dataclass\nclass User:\n    id: int\n    nickname: str | None\n";
    const toTypeScript = convert({
      sourceFormat: "python",
      targetFormat: "typescript",
      input,
    });
    const toPython = convert({
      sourceFormat: "python",
      targetFormat: "python",
      input,
    });
    expect(toTypeScript.ok).toBe(true);
    expect(toPython.ok).toBe(true);
    if (toPython.ok) expect(toPython.output).toContain("nickname: str | None");
  });

  it("accepts Shape documents from TypeScript and Rust", () => {
    const typeScript = convert({
      sourceFormat: "typescript",
      targetFormat: "python",
      input: "interface User { id: number }",
    });
    const rust = convert({
      sourceFormat: "rust",
      targetFormat: "python",
      input: "struct User { id: u64 }",
    });
    expect(typeScript.ok).toBe(true);
    expect(rust.ok).toBe(true);
    if (typeScript.ok) expect(typeScript.output).toContain("class User:");
    if (rust.ok) expect(rust.output).toContain("class User:");
  });

  it("validates the Python cross-format route family", () => {
    const python = `@dataclass
class User:
    id: int
    nickname: str | None
`;
    const routes = [
      ["python", "python", python],
      ["python", "typescript", python],
      ["python", "rust", python],
      ["python", "json-schema", python],
      [
        "typescript",
        "python",
        "interface User { id: number; nickname: string | null }",
      ],
      ["rust", "python", "struct User { id: i64, }"],
      [
        "json-schema",
        "python",
        JSON.stringify({
          type: "object",
          properties: { name: { type: "string", minLength: 2 } },
          required: ["name"],
        }),
      ],
    ] as const;
    for (const [sourceFormat, targetFormat, input] of routes) {
      const result = convert({ sourceFormat, targetFormat, input });
      expect(result.ok, `${sourceFormat} -> ${targetFormat}`).toBe(true);
    }
    const typeScript = convert({
      sourceFormat: "python",
      targetFormat: "typescript",
      input: python,
    });
    expect(typeScript.ok).toBe(true);
    if (typeScript.ok)
      expect(typeScript.report?.lossHotspots).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: "integer-widening" }),
        ]),
      );
  });

  it("reports constraints lost by dataclass annotations", () => {
    const result = convert({
      sourceFormat: "json-schema",
      targetFormat: "python",
      input: JSON.stringify({
        type: "object",
        properties: { name: { type: "string", minLength: 2 } },
        required: ["name"],
      }),
    });
    expect(result.ok).toBe(true);
    if (result.ok)
      expect(
        result.losses?.some(
          (loss) => loss.lostCapability === "string-constraints",
        ),
      ).toBe(true);
  });

  it("reports inline root declaration-name loss in JSON Schema conversion", () => {
    const result = convert({
      sourceFormat: "python",
      targetFormat: "json-schema",
      input: "@dataclass\nclass User:\n    id: int\n",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.report?.semanticNotes?.generate).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "root-declaration-name-not-preserved",
          }),
        ]),
      );
    }
  });

  it("converts string-keyed maps across schema-oriented targets", () => {
    const input = `@dataclass
class User:
    labels: dict[str, str | None]
`;
    for (const targetFormat of [
      "python",
      "typescript",
      "json-schema",
      "zod",
      "openapi",
      "rust",
      "go",
      "java",
      "kotlin",
    ] as const) {
      const result = convert({
        sourceFormat: "python",
        targetFormat,
        input,
        includeArtifacts: true,
      });
      expect(result.ok, `python -> ${targetFormat}`).toBe(true);
      if (!result.ok) continue;
      expect(result.artifacts?.shape).toBeDefined();
      expect(result.output).toBeTruthy();
    }
  });

  it("converts a pure JSON Schema map to a Python alias", () => {
    const result = convert({
      sourceFormat: "json-schema",
      targetFormat: "python",
      input: JSON.stringify({
        title: "Metadata",
        type: "object",
        additionalProperties: { type: "string" },
      }),
      name: "Metadata",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.output).toContain("Metadata = dict[str, str]");
  });
});
