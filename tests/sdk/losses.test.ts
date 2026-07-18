import { describe, expect, it } from "vitest";
import { constraintDocument } from "@aio/core";
import { planSemanticLosses } from "../../packages/sdk/src/losses.js";
import { describeConversionRouteCapabilities } from "../../packages/sdk/src/registry.js";

describe("sdk semantic losses", () => {
  it("deduplicates repeated losses for the same capability and source path", () => {
    const losses = planSemanticLosses(
      describeConversionRouteCapabilities("json-schema", "typescript"),
      constraintDocument("User", [
        {
          target: {
            kind: "node",
            path: ["root", "id"],
          },
          constraints: [
            { kind: "min-length", value: 2 },
            { kind: "max-length", value: 10 },
          ],
        },
      ]),
      "typescript",
      "json-schema",
    );

    expect(losses).toEqual([
      {
        code: "target-cannot-preserve-constraint",
        message:
          "TypeScript output cannot preserve string constraints from root.id.",
        severity: "warning",
        phase: "generate",
        lostCapability: "string-constraints",
        sourcePath: ["root", "id"],
        targetFormat: "typescript",
        evidence: {
          constraintKind: "min-length",
          targetKind: "node",
        },
      },
    ]);
  });

  it("skips loss planning when the chosen route can preserve constraints", () => {
    const losses = planSemanticLosses(
      describeConversionRouteCapabilities("json-schema", "json-schema"),
      constraintDocument("User", [
        {
          target: {
            kind: "node",
            path: ["root"],
          },
          constraints: [{ kind: "closed-object", value: false }],
        },
      ]),
      "json-schema",
      "json-schema",
    );

    expect(losses).toEqual([]);
  });
});
