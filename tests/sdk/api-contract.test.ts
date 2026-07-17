import { describe, expect, it } from "vitest";
import * as sdkModule from "../../packages/sdk/src/index.js";

describe("sdk api contract", () => {
  it("re-exports the orchestration surface", () => {
    expect(sdkModule.planConversion).toBeDefined();
    expect(sdkModule.listConversionRoutes).toBeDefined();
    expect(sdkModule.convert).toBeDefined();
  });

  it("re-exports the TypeScript parser surface", () => {
    expect(sdkModule.typeScriptParser).toBeDefined();
    expect(sdkModule.configureTypeScriptParser).toBeDefined();
    expect(sdkModule.preprocessTypeScriptSource).toBeDefined();
    expect(sdkModule.createTypeScriptSourceFile).toBeDefined();
  });

  it("re-exports the JSON Schema parser surface", () => {
    expect(sdkModule.jsonSchemaParser).toBeDefined();
    expect(sdkModule.configureJsonSchemaParser).toBeDefined();
    expect(sdkModule.inferJsonSchemaDocument).toBeDefined();
    expect(sdkModule.tryInferJsonSchemaDocument).toBeDefined();
  });

  it("plans the explicit json to typescript route", () => {
    expect(sdkModule.planConversion("json", "typescript")).toEqual({
      sourceFormat: "json",
      targetFormat: "typescript",
      irSequence: ["value", "shape"],
      stages: [
        { kind: "parse-source", from: "json", to: "json-value" },
        {
          kind: "lower-to-value",
          from: "json-value",
          to: "value",
          ir: "value",
        },
        { kind: "infer-shape", from: "value", to: "shape", ir: "shape" },
        { kind: "generate-target", from: "shape", to: "typescript" },
      ],
    });
  });

  it("converts json through value and shape artifacts", () => {
    const result = sdkModule.convert({
      sourceFormat: "json",
      targetFormat: "typescript",
      input: '{"id":1,"name":"Ada"}',
      name: "User",
      includeArtifacts: true,
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.output).toContain("export interface User");
    expect(result.artifacts?.value?.kind).toBe("value-document");
    expect(result.artifacts?.shape?.name.source).toBe("User");
    expect(result.plan.irSequence).toEqual(["value", "shape"]);
  });

  it("preserves json-schema constraint artifacts through orchestration", () => {
    const result = sdkModule.convert({
      sourceFormat: "json-schema",
      targetFormat: "json-schema",
      input: JSON.stringify({
        title: "ClosedUser",
        type: "object",
        properties: {
          id: {
            type: "string",
          },
        },
        additionalProperties: false,
      }),
      includeArtifacts: true,
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.artifacts?.constraints?.entries).toEqual([
      {
        target: {
          kind: "node",
          path: ["root"],
        },
        constraints: [
          {
            kind: "closed-object",
            value: false,
            message:
              'This JSON Schema "additionalProperties: false" rule was preserved in constraint IR.',
            evidence: {
              sourceKeyword: "additionalProperties",
            },
          },
        ],
      },
    ]);
  });
});
