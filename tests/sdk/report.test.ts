import { describe, expect, it } from "vitest";
import type { SchemaDiagnostic, SchemaSemanticNote } from "@aio/core";
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
    const parseSemanticNotes: SchemaSemanticNote[] = [
      {
        kind: "policy",
        code: "typescript-implicit-entry-selected",
        message:
          'The TypeScript parser selected entry "UserList" implicitly using the single local root rule.',
        path: ["entry", "UserList"],
        nodeKind: "entry",
        source: "parser-typescript",
        layer: "shape",
        evidence: {
          entry: "UserList",
          selectionReason: "single-root",
        },
      },
    ];
    const generateSemanticNotes: SchemaSemanticNote[] = [
      {
        kind: "widening",
        code: "integer-widened-to-number",
        message:
          "TypeScript output widens integer semantics to number because the target language has no distinct integer type.",
        path: ["root", "id"],
        nodeKind: "scalar",
        source: "generator-typescript",
        layer: "target",
        evidence: {
          sourceScalar: "integer",
          renderedScalar: "number",
        },
      },
      {
        kind: "policy",
        code: "generator-target-policy",
        message: "The generator applied a target shaping policy.",
        path: ["root"],
        source: "sdk-test-generator",
        layer: "target",
        evidence: {
          targetPolicy: "compact-output",
        },
      },
    ];
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
      parseSemanticNotes,
      generateSemanticNotes,
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
      entrySelection: {
        mode: "implicit",
        entry: "UserList",
        strategyCode: "single-root",
        source: "parser-typescript",
        path: ["entry", "UserList"],
        evidence: {
          entry: "UserList",
          selectionReason: "single-root",
        },
      },
      semanticCaveats: [
        {
          phase: "generate",
          kind: "widening",
          code: "integer-widened-to-number",
          message:
            "TypeScript output widens integer semantics to number because the target language has no distinct integer type.",
          source: "generator-typescript",
          path: ["root", "id"],
          layer: "target",
          evidence: {
            sourceScalar: "integer",
            renderedScalar: "number",
          },
        },
      ],
      policyDecisions: [
        {
          phase: "parse",
          code: "typescript-implicit-entry-selected",
          message:
            'The TypeScript parser selected entry "UserList" implicitly using the single local root rule.',
          source: "parser-typescript",
          path: ["entry", "UserList"],
          evidence: {
            entry: "UserList",
            selectionReason: "single-root",
          },
        },
        {
          phase: "generate",
          code: "generator-target-policy",
          message: "The generator applied a target shaping policy.",
          source: "sdk-test-generator",
          path: ["root"],
          evidence: {
            targetPolicy: "compact-output",
          },
        },
      ],
      preservedCapabilities: ["shape-ir"],
      semanticNotes: {
        parse: parseSemanticNotes,
        generate: generateSemanticNotes,
        all: [...parseSemanticNotes, ...generateSemanticNotes],
      },
    });

    expect(buildConversionReport([], [], [], [], [], [])).toBeUndefined();
  });
});
