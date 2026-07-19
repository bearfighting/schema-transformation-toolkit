import { describe, expect, it } from "vitest";
import * as sdkModule from "../../packages/sdk/src/index.js";

describe("sdk api contract", () => {
  it("exposes only the stage 1 pipeline runtime surface", () => {
    expect(Object.keys(sdkModule).sort()).toEqual([
      "convert",
      "describeConversionRouteCapabilities",
      "inspectTypeScriptImplicitEntry",
      "listConversionRoutes",
      "planConversion",
    ]);
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

  it("plans the json-schema to json-schema route with constraint ir when both sides declare it", () => {
    expect(sdkModule.planConversion("json-schema", "json-schema")).toEqual({
      sourceFormat: "json-schema",
      targetFormat: "json-schema",
      irSequence: ["shape", "constraint"],
      stages: [
        { kind: "parse-source", from: "json-schema", to: "shape", ir: "shape" },
        { kind: "generate-target", from: "shape", to: "json-schema" },
      ],
    });
  });

  it("describes route capabilities from parser and generator declarations", () => {
    expect(
      sdkModule.describeConversionRouteCapabilities(
        "json-schema",
        "typescript",
      ),
    ).toEqual({
      supportsValueIr: false,
      supportsShapeIr: true,
      supportsConstraintIr: false,
      parserCapabilities: [
        "shape-ir",
        "constraint-ir",
        "string-constraints",
        "numeric-constraints",
        "collection-constraints",
        "object-constraints",
        "portable-annotations",
      ],
      generatorCapabilities: ["shape-ir"],
      preservedCapabilities: ["shape-ir"],
      potentiallyLostCapabilities: [
        "constraint-ir",
        "string-constraints",
        "numeric-constraints",
        "collection-constraints",
        "object-constraints",
        "portable-annotations",
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
    expect(result.report?.preservedCapabilities).toEqual([
      "value-ir",
      "shape-ir",
    ]);
  });

  it("surfaces implicit TypeScript entry selection in the higher-level report", () => {
    const result = sdkModule.convert({
      sourceFormat: "typescript",
      targetFormat: "typescript",
      input: [
        "type InternalToken = string;",
        "export type User = { token: InternalToken };",
        "export type UserList = User[];",
      ].join("\n"),
      name: "ImplicitEntryDocument",
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.report?.entrySelection).toEqual({
      mode: "implicit",
      entry: "UserList",
      strategyCode: "single-exported-root",
      source: "parser-typescript",
      path: ["entry", "UserList"],
      evidence: {
        entry: "UserList",
        selectionReason: "single-exported-root",
      },
    });
    expect(result.report?.policyDecisions).toEqual([
      {
        phase: "parse",
        code: "typescript-implicit-entry-selected",
        message:
          'The TypeScript parser selected entry "UserList" implicitly using the single exported root rule.',
        source: "parser-typescript",
        path: ["entry", "UserList"],
        evidence: {
          entry: "UserList",
          selectionReason: "single-exported-root",
        },
      },
    ]);
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
    expect(result.preservedCapabilities).toEqual([
      "shape-ir",
      "constraint-ir",
      "object-constraints",
    ]);
    expect(result.report).toEqual({
      preservedCapabilities: [
        "shape-ir",
        "constraint-ir",
        "object-constraints",
      ],
      semanticNotes: {
        parse: result.semanticNotes,
        all: result.semanticNotes,
      },
    });
  });

  it("reports semantic loss when json-schema constraints cannot be preserved in TypeScript", () => {
    const result = sdkModule.convert({
      sourceFormat: "json-schema",
      targetFormat: "typescript",
      input: JSON.stringify({
        title: "User",
        type: "object",
        properties: {
          id: {
            type: "string",
            minLength: 2,
          },
        },
        required: ["id"],
        additionalProperties: false,
      }),
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.preservedCapabilities).toEqual(["shape-ir"]);
    expect(result.losses).toEqual([
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
      {
        code: "target-cannot-preserve-constraint",
        message:
          "TypeScript output cannot preserve object constraints from root.",
        severity: "warning",
        phase: "generate",
        lostCapability: "object-constraints",
        sourcePath: ["root"],
        targetFormat: "typescript",
        evidence: {
          constraintKind: "closed-object",
          targetKind: "node",
        },
      },
    ]);
    expect(result.report).toEqual({
      losses: result.losses,
      preservedCapabilities: ["shape-ir"],
      semanticNotes: {
        parse: result.semanticNotes,
        all: result.semanticNotes,
      },
    });
  });

  it("reports portable-annotation loss only when the selected route declares that capability as lossy", () => {
    const result = sdkModule.convert({
      sourceFormat: "json-schema",
      targetFormat: "typescript",
      input: JSON.stringify({
        title: "AnnotatedUser",
        type: "object",
        description: "A user model",
        properties: {
          id: {
            type: "string",
            description: "User identifier",
          },
        },
        required: ["id"],
      }),
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.losses).toEqual([
      {
        code: "target-cannot-preserve-constraint",
        message:
          "TypeScript output cannot preserve portable annotations from root.id.",
        severity: "warning",
        phase: "generate",
        lostCapability: "portable-annotations",
        sourcePath: ["root", "id"],
        targetFormat: "typescript",
        evidence: {
          constraintKind: "description",
          targetKind: "node",
        },
      },
      {
        code: "target-cannot-preserve-constraint",
        message:
          "TypeScript output cannot preserve portable annotations from root.",
        severity: "warning",
        phase: "generate",
        lostCapability: "portable-annotations",
        sourcePath: ["root"],
        targetFormat: "typescript",
        evidence: {
          constraintKind: "description",
          targetKind: "node",
        },
      },
    ]);
  });
});
