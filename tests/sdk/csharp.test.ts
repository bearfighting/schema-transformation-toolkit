import { describe, expect, it } from "vitest";
import {
  convert,
  describeFormatSupport,
  describeGeneratorOptions,
  describeParserOptions,
  listSourceFormatSupports,
  listTargetFormatSupports,
  planConversion,
} from "../../packages/sdk/src/index.js";

describe("SDK C# builtin integration", () => {
  it("discovers C# as a Shape parser and generator", () => {
    expect(describeFormatSupport("csharp")).toMatchObject({
      format: "csharp",
      parser: { producesIr: ["shape"], capabilities: ["shape-ir"] },
      generator: {
        consumesIr: ["shape"],
        entryIr: ["shape"],
        capabilities: ["shape-ir"],
      },
      constraintFamilies: [],
    });
    expect(listSourceFormatSupports().map((item) => item.format)).toContain(
      "csharp",
    );
    expect(listTargetFormatSupports().map((item) => item.format)).toContain(
      "csharp",
    );
  });

  it("plans generic C# Shape routes without format-specific branches", () => {
    expect(planConversion("csharp", "csharp")).toMatchObject({
      sourceFormat: "csharp",
      targetFormat: "csharp",
      irSequence: ["shape"],
    });
    expect(planConversion("csharp", "typescript")).toMatchObject({
      irSequence: ["shape"],
    });
    expect(planConversion("json-schema", "csharp")).toMatchObject({
      irSequence: ["shape"],
    });
  });

  it("converts C# through the shared pipeline", () => {
    const typescript = convert({
      sourceFormat: "csharp",
      targetFormat: "typescript",
      input: "public record User(string Name);",
    });
    expect(typescript).toMatchObject({ ok: true });
    if (typescript.ok) expect(typescript.output).toContain("name");

    const csharp = convert({
      sourceFormat: "json-schema",
      targetFormat: "csharp",
      input: JSON.stringify({
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
      }),
      advanced: {
        generator: { csharp: { namespace: "Example.Models", style: "class" } },
      },
    });
    expect(csharp).toMatchObject({ ok: true });
    if (csharp.ok) {
      expect(csharp.output).toContain("namespace Example.Models;");
      expect(csharp.output).toContain("sealed class");
    }

    const roundTrip = convert({
      sourceFormat: "csharp",
      targetFormat: "csharp",
      input: "record Envelope(User User); record User(string Name);",
      advanced: { parser: { csharp: { entry: "Envelope" } } },
    });
    expect(roundTrip).toMatchObject({ ok: true });
    if (roundTrip.ok) expect(roundTrip.output).toContain("Envelope");
  });

  it("exposes C# option metadata and structured failures", () => {
    expect(describeParserOptions("csharp").options).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: "entry" })]),
    );
    expect(describeGeneratorOptions("csharp").options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "namespace" }),
        expect.objectContaining({ key: "style" }),
      ]),
    );
    expect(
      convert({
        sourceFormat: "csharp",
        targetFormat: "typescript",
        input: "record User(string Name); record Other(string Value);",
      }),
    ).toMatchObject({ ok: false, phase: "parse" });
    expect(
      convert({
        sourceFormat: "json-schema",
        targetFormat: "csharp",
        input: JSON.stringify({ type: "object" }),
        advanced: { generator: { csharp: { style: "invalid" } } },
      }),
    ).toMatchObject({ ok: false, phase: "generate" });
  });
});
