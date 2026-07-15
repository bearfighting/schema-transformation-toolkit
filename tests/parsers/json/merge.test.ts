import { describe, expect, it } from "vitest";
import { schemaUnknownNode } from "../../../packages/core/src/index.js";
import { mergeTypeNodes } from "../../../packages/parsers/json/src/merge.js";

describe("parser-json merge", () => {
  it("keeps the left unknown reason while merging nullable state", () => {
    const left = schemaUnknownNode({
      reason: "empty-array-element",
    });
    const right = schemaUnknownNode({
      reason: "mixed-types-collapsed",
      nullable: true,
    });

    expect(mergeTypeNodes(left, right, "unknown merge", "unknown")).toEqual({
      kind: "unknown",
      reason: "empty-array-element",
      nullable: true,
    });
  });
});
