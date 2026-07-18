import { describe, expect, it } from "vitest";
import type { SchemaDiagnostic } from "@aio/core";
import {
  buildConversionReport,
  collectPreservedCapabilities,
  combineDiagnostics,
} from "../../packages/sdk/src/report.js";
import {
  parseJsonValueDocumentWithOptions,
  tryInferJsonDocumentFromValueDocumentWithOptions,
} from "../../packages/parsers/json/src/value.js";

describe("sdk reporting helpers", () => {
  it("combines diagnostics only when extra entries exist", () => {
    const parseDiagnostics: SchemaDiagnostic[] = [
      {
        code: "parse-warning",
        message: "parse warning",
        severity: "warning",
        source: "sdk-test",
      },
    ];

    expect(combineDiagnostics(parseDiagnostics, undefined)).toEqual(
      parseDiagnostics,
    );
    expect(combineDiagnostics([], undefined)).toBeUndefined();
  });

  it("collects preserved capabilities from available artifacts and route support", () => {
    const value = parseJsonValueDocumentWithOptions('{"id":1}', {
      name: "User",
    });
    const shapeResult = tryInferJsonDocumentFromValueDocumentWithOptions(
      value,
      {
        name: "User",
      },
    );

    expect(shapeResult.ok).toBe(true);

    if (!shapeResult.ok) {
      return;
    }

    const preserved = collectPreservedCapabilities(
      "json",
      "typescript",
      value,
      shapeResult.document,
      undefined,
    );

    expect(preserved).toEqual(["value-ir", "shape-ir"]);
  });

  it("builds an aggregated report only when there is something to report", () => {
    const report = buildConversionReport(
      [
        {
          code: "parse-warning",
          message: "parse warning",
          severity: "warning",
          source: "sdk-test",
        },
      ],
      [],
      [],
      ["shape-ir"],
      [],
      [],
    );

    expect(report).toEqual({
      diagnostics: {
        parse: [
          {
            code: "parse-warning",
            message: "parse warning",
            severity: "warning",
            source: "sdk-test",
          },
        ],
        all: [
          {
            code: "parse-warning",
            message: "parse warning",
            severity: "warning",
            source: "sdk-test",
          },
        ],
      },
      preservedCapabilities: ["shape-ir"],
    });

    expect(buildConversionReport([], [], [], [], [], [])).toBeUndefined();
  });
});
