import { describe, expect, it } from "vitest";
import { convert } from "@schema-transformation-toolkit/sdk";

const goUser = "package models\ntype User struct { ID int64 }";

describe("SDK Go integration", () => {
  it("converts Go through Shape IR without an undeclared empty Constraint IR", () => {
    const result = convert({
      sourceFormat: "go",
      targetFormat: "go",
      input: goUser,
      name: "User",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain("type User struct");
    expect(result.artifacts?.constraints).toBeUndefined();
  });

  it("converts Go Shape IR to TypeScript", () => {
    const result = convert({
      sourceFormat: "go",
      targetFormat: "typescript",
      input: goUser,
      name: "User",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain("id");
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
            },
          },
        },
      }),
      ["root", "score"],
    ],
  ] as const)(
    "retains %s constraints and reports Go target loss",
    (sourceFormat, input, path) => {
      expectGoConstraintLoss({
        sourceFormat,
        input,
        name: "Score",
        constraint: { path: [...path], kind: "minimum", value: 0 },
      });
    },
  );
});

function expectGoConstraintLoss(input: {
  sourceFormat: "json-schema" | "zod" | "openapi";
  input: string;
  name: string;
  constraint: { path: string[]; kind: string; value: number };
}): void {
  const result = convert({
    sourceFormat: input.sourceFormat,
    targetFormat: "go",
    input: input.input,
    name: input.name,
    includeArtifacts: true,
  });

  expect(result.ok, JSON.stringify(result)).toBe(true);
  if (!result.ok) return;
  expect(result.artifacts?.constraints?.entries).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        target: { kind: "node", path: input.constraint.path },
        constraints: [
          expect.objectContaining({
            kind: input.constraint.kind,
            value: input.constraint.value,
          }),
        ],
      }),
    ]),
  );
  expect(result.losses ?? []).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        lostCapability: "numeric-constraints",
        sourcePath: input.constraint.path,
        evidence: {
          constraintKind: input.constraint.kind,
          targetKind: "node",
        },
      }),
    ]),
  );
}
