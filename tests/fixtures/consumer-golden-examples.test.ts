import { describe, expect, it } from "vitest";
import {
  consumerGoldenExamples,
  listConsumerGoldenExamples,
} from "../../examples/fixtures/consumer-golden-examples.js";

describe("consumer golden examples", () => {
  it("defines stable unique ids and non-empty core fields", () => {
    const ids = new Set<string>();

    for (const example of consumerGoldenExamples) {
      expect(example.id).toBeTruthy();
      expect(ids.has(example.id)).toBe(false);
      ids.add(example.id);

      expect(example.title).toBeTruthy();
      expect(example.input).toBeTruthy();
      expect(example.summary).toBeTruthy();
      expect(["basic", "lossy", "unsupported"]).toContain(example.category);
      expect(["json", "json-schema", "typescript"]).toContain(
        example.sourceFormat,
      );
      expect(["json-schema", "typescript"]).toContain(example.targetFormat);
    }
  });

  it("covers both basic and lossy consumer-facing scenarios", () => {
    const categories = new Set(
      consumerGoldenExamples.map((example) => example.category),
    );

    expect(categories.has("basic")).toBe(true);
    expect(categories.has("lossy")).toBe(true);
  });

  it("returns cloned diagnostic arrays for downstream mutation safety", () => {
    const listed = listConsumerGoldenExamples();

    listed[0]!.expectedDiagnosticCodes.push("mutated");

    expect(consumerGoldenExamples[0]!.expectedDiagnosticCodes).toEqual([]);
  });
});
