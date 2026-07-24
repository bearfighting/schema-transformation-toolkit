import { describe, expect, it } from "vitest";
import {
  collectUserFacingDiagnostics,
  convert,
  publicConvertResultSchema,
} from "../../packages/sdk/src/index.js";

describe("sdk web-facing contract", () => {
  it("validates a successful convert result against the public schema", () => {
    const result = convert({
      sourceFormat: "json",
      targetFormat: "typescript",
      input: '{"id":1,"name":"Ada"}',
      name: "User",
      includeArtifacts: true,
    });

    expect(() => publicConvertResultSchema.parse(result)).not.toThrow();
  });

  it("validates a failed convert result against the public schema", () => {
    const result = convert({
      sourceFormat: "typescript",
      targetFormat: "json-schema",
      input: "export type User = () => string;",
      name: "UserDocument",
    });

    expect(result.ok).toBe(false);
    expect(() => publicConvertResultSchema.parse(result)).not.toThrow();
  });

  it("collects user-facing diagnostics for successful conversions", () => {
    const result = convert({
      sourceFormat: "json-schema",
      targetFormat: "typescript",
      input: JSON.stringify({
        title: "ExampleDocument",
        $defs: {
          Count: {
            type: "integer",
          },
          FallbackValue: true,
          FlexibleValue: {
            anyOf: [{ const: "open" }, { $ref: "#/$defs/FallbackValue" }],
          },
        },
        type: "object",
        properties: {
          id: { $ref: "#/$defs/Count" },
          value: { $ref: "#/$defs/FlexibleValue" },
        },
        required: ["id", "value"],
      }),
    });

    expect(result.ok).toBe(true);

    const diagnostics = collectUserFacingDiagnostics(result);

    expect(
      diagnostics.map((diagnostic) => ({
        severity: diagnostic.severity,
        code: diagnostic.code,
        path: diagnostic.path,
        source: diagnostic.source,
      })),
    ).toEqual([
      {
        severity: "warning",
        code: "json-schema-true-schema-lowered",
        path: "definitions.FallbackValue",
        source: "parser-json-schema",
      },
      {
        severity: "warning",
        code: "json-schema-union-composition-lowered",
        path: "definitions.FlexibleValue",
        source: "parser-json-schema",
      },
      {
        severity: "warning",
        code: "integer-widened-to-number",
        path: "definitions.Count",
        source: "generator-typescript",
      },
      {
        severity: "warning",
        code: "wide-unknown-type",
        path: "definitions.FallbackValue",
        source: "generator-typescript",
      },
      {
        severity: "warning",
        code: "unknown-union-member-absorbs-union",
        path: "definitions.FlexibleValue",
        source: "generator-typescript",
      },
      {
        severity: "warning",
        code: "integer-widened-to-number",
        path: "definitions.Count",
        source: "generator-typescript",
      },
      {
        severity: "warning",
        code: "wide-unknown-type",
        path: "definitions.FallbackValue",
        source: "generator-typescript",
      },
      {
        severity: "warning",
        code: "unknown-union-member-absorbs-union",
        path: "definitions.FlexibleValue",
        source: "generator-typescript",
      },
    ]);

    expect(
      diagnostics.find(
        (diagnostic) => diagnostic.code === "integer-widened-to-number",
      ),
    ).toMatchObject({
      title: "Integer Widened To Number",
      suggestion:
        "Treat the generated TypeScript type as semantically wider than a distinct integer type.",
    });
  });

  it("collects user-facing diagnostics for failed conversions", () => {
    const result = convert({
      sourceFormat: "typescript",
      targetFormat: "json-schema",
      input: "export type User = () => string;",
      name: "UserDocument",
    });

    expect(result.ok).toBe(false);

    const diagnostics = collectUserFacingDiagnostics(result);

    expect(diagnostics[0]).toEqual({
      severity: "error",
      code: "unsupported-typescript-function-type",
      title: "Unsupported Typescript Function Type",
      message:
        "Function types are outside the supported TypeScript schema subset.",
      source: "sdk",
      suggestion:
        "Check whether the source input fits the currently supported subset for the selected source format.",
      technicalDetails: {
        phase: "parse",
        plan: result.plan,
      },
    });

    expect(diagnostics[1]).toMatchObject({
      severity: "error",
      code: "unsupported-typescript-function-type",
      title: "Unsupported Typescript Function Type",
      source: "parser-typescript",
      sourceRange: {
        start: { offset: 19, line: 1, column: 20 },
        end: { offset: 31, line: 1, column: 32 },
        length: 12,
      },
    });
  });
});
