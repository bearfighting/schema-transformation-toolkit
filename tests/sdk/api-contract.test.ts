import { describe, expect, it } from "vitest";
import * as sdkModule from "../../packages/sdk/src/index.js";
import { sharedSemanticFixtures } from "../fixtures/semantics/index.js";
import {
  expectSemanticCaveatCodes,
  expectSemanticLosses,
} from "../helpers/report-assertions.js";

type FixtureRouteSourceFormat = "json" | "json-schema" | "typescript";
type FixtureRouteTargetFormat = "json-schema" | "typescript";

function getFixtureRouteInput(
  fixture: (typeof sharedSemanticFixtures)[number],
  sourceFormat: FixtureRouteSourceFormat,
): string {
  switch (sourceFormat) {
    case "json": {
      const source = fixture.sources.json;

      if (!source) {
        break;
      }

      return source.input;
    }
    case "typescript": {
      const source = fixture.sources.typescript;

      if (!source) {
        break;
      }

      return source.input;
    }
    case "json-schema": {
      const source = fixture.sources["json-schema"];

      if (!source) {
        break;
      }

      return JSON.stringify(source.input);
    }
  }

  throw new Error(
    `Expected fixture "${fixture.id}" to define a ${sourceFormat} source.`,
  );
}

describe("sdk api contract", () => {
  it("exposes only the stage 1 pipeline runtime surface", () => {
    expect(Object.keys(sdkModule).sort()).toEqual([
      "collectUserFacingDiagnostics",
      "conversionArtifactsSchema",
      "conversionCapabilityRequirementSchema",
      "conversionEntrySelectionSchema",
      "conversionLossHotspotSchema",
      "conversionPolicyDecisionSchema",
      "conversionReportSchema",
      "conversionRouteSchema",
      "conversionSemanticCaveatSchema",
      "convert",
      "convertFailureResultSchema",
      "convertSuccessResultSchema",
      "describeConversionRouteCapabilities",
      "describeFormatSupport",
      "inspectTypeScriptImplicitEntry",
      "listConversionRoutes",
      "listFormatSupports",
      "planConversion",
      "publicConvertResultSchema",
      "schemaDiagnosticSchema",
      "semanticLossSchema",
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
    expect(result.report?.capabilityRequirements).toEqual([
      {
        feature: "object",
        path: ["root"],
        referenceStack: [],
      },
    ]);
    expect(result.report?.lossHotspots).toEqual([
      {
        code: "integer-widening",
        path: ["root", "id"],
        referenceStack: [],
        evidence: {
          sourceScalar: "integer",
          renderedScalar: "number",
        },
      },
    ]);
  });

  it("surfaces generator semantic caveats in the higher-level report", () => {
    const result = sdkModule.convert({
      sourceFormat: "json",
      targetFormat: "typescript",
      input: '{"id":1,"name":"Ada"}',
      name: "User",
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.report?.semanticCaveats).toEqual([
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
    ]);
    expect(result.report?.capabilityRequirements).toEqual([
      {
        feature: "object",
        path: ["root"],
        referenceStack: [],
      },
    ]);
    expect(result.report?.lossHotspots).toEqual([
      {
        code: "integer-widening",
        path: ["root", "id"],
        referenceStack: [],
        evidence: {
          sourceScalar: "integer",
          renderedScalar: "number",
        },
      },
    ]);
  });

  const fixtureRouteExpectations = sharedSemanticFixtures.flatMap((fixture) =>
    Object.entries(fixture.conversionExpectations ?? {}).map(
      ([routeId, expectation]) => ({
        fixture,
        routeId,
        expectation,
      }),
    ),
  );

  for (const { fixture, routeId, expectation } of fixtureRouteExpectations) {
    it(`surfaces fixture-driven semantic caveats in the higher-level report for ${fixture.id} on ${routeId}`, () => {
      const [sourceFormat, targetFormat] = routeId.split("->") as [
        FixtureRouteSourceFormat,
        FixtureRouteTargetFormat,
      ];
      const source = fixture.sources[sourceFormat];

      expect(source).toBeDefined();

      if (!source) {
        throw new Error(
          `Expected fixture "${fixture.id}" to define a ${sourceFormat} source.`,
        );
      }

      const result = sdkModule.convert({
        sourceFormat,
        targetFormat,
        input: getFixtureRouteInput(fixture, sourceFormat),
        ...(source.options?.name ? { name: source.options.name } : {}),
      });

      expect(result.ok).toBe(true);

      if (!result.ok) {
        return;
      }

      if (expectation.semanticCaveatCodes) {
        expectSemanticCaveatCodes(
          result.report?.semanticCaveats,
          expectation.semanticCaveatCodes,
        );
      }

      if (expectation.semanticLosses) {
        expectSemanticLosses(result.losses, expectation.semanticLosses);
      }
    });
  }

  it("surfaces referenced unknown-union widening caveats in the higher-level report", () => {
    const result = sdkModule.convert({
      sourceFormat: "json-schema",
      targetFormat: "typescript",
      input: JSON.stringify({
        title: "WideValuesDocument",
        $defs: {
          FallbackValue: true,
          WideValues: {
            anyOf: [{ const: "open" }, { $ref: "#/$defs/FallbackValue" }],
          },
        },
        $ref: "#/$defs/WideValues",
      }),
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.report?.semanticCaveats).toEqual([
      {
        phase: "generate",
        kind: "widening",
        code: "wide-unknown-type",
        message:
          "This schema node renders as TypeScript unknown and may accept values more broadly than the source evidence suggests.",
        source: "generator-typescript",
        path: ["definitions", "FallbackValue"],
        layer: "target",
        evidence: {
          reason: "no-evidence",
          nullable: false,
          renderedForm: "unknown",
          sourceEvidence: {
            source: "parser-json",
            detail: "JSON Schema boolean true was lowered to unknown.",
          },
        },
      },
      {
        phase: "generate",
        kind: "widening",
        code: "unknown-union-member-absorbs-union",
        message:
          "This union includes an unknown member, so the rendered TypeScript union may accept values more broadly than the non-unknown branches suggest.",
        source: "generator-typescript",
        path: ["definitions", "WideValues"],
        layer: "target",
        evidence: {
          unknownMemberIndexes: [1],
          memberKinds: ["literal", "reference"],
        },
      },
    ]);
    expect(result.report?.capabilityRequirements).toEqual([
      {
        feature: "local-reference",
        path: ["root"],
        referenceStack: [],
        evidence: {
          targetDefinition: "WideValues",
        },
      },
      {
        feature: "union",
        path: ["root"],
        referenceStack: ["WideValues"],
        containingDefinitionName: "WideValues",
      },
      {
        feature: "local-reference",
        path: ["root", "1"],
        referenceStack: ["WideValues"],
        containingDefinitionName: "WideValues",
        evidence: {
          targetDefinition: "FallbackValue",
        },
      },
    ]);
    expect(result.report?.lossHotspots).toEqual([
      {
        code: "unknown-union-absorption",
        path: ["root"],
        referenceStack: ["WideValues"],
        containingDefinitionName: "WideValues",
        evidence: {
          unknownMemberIndexes: [1],
          memberKinds: ["literal", "reference"],
        },
      },
      {
        code: "wide-unknown",
        path: ["root", "1"],
        referenceStack: ["WideValues", "FallbackValue"],
        containingDefinitionName: "FallbackValue",
        evidence: {
          reason: "no-evidence",
          nullable: false,
          renderedForm: "unknown",
          sourceEvidence: {
            source: "parser-json",
            detail: "JSON Schema boolean true was lowered to unknown.",
          },
        },
      },
    ]);
  });

  it("keeps the sdk report analysis example aligned with real report output", () => {
    const result = sdkModule.convert({
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

    if (!result.ok) {
      return;
    }

    expect(result.report?.semanticCaveats).toEqual([
      {
        phase: "generate",
        kind: "widening",
        code: "integer-widened-to-number",
        message:
          "TypeScript output widens integer semantics to number because the target language has no distinct integer type.",
        source: "generator-typescript",
        path: ["definitions", "Count"],
        layer: "target",
        evidence: {
          sourceScalar: "integer",
          renderedScalar: "number",
        },
      },
      {
        phase: "generate",
        kind: "widening",
        code: "wide-unknown-type",
        message:
          "This schema node renders as TypeScript unknown and may accept values more broadly than the source evidence suggests.",
        source: "generator-typescript",
        path: ["definitions", "FallbackValue"],
        layer: "target",
        evidence: {
          reason: "no-evidence",
          nullable: false,
          renderedForm: "unknown",
          sourceEvidence: {
            source: "parser-json",
            detail: "JSON Schema boolean true was lowered to unknown.",
          },
        },
      },
      {
        phase: "generate",
        kind: "widening",
        code: "unknown-union-member-absorbs-union",
        message:
          "This union includes an unknown member, so the rendered TypeScript union may accept values more broadly than the non-unknown branches suggest.",
        source: "generator-typescript",
        path: ["definitions", "FlexibleValue"],
        layer: "target",
        evidence: {
          unknownMemberIndexes: [1],
          memberKinds: ["literal", "reference"],
        },
      },
    ]);

    expect(result.report?.capabilityRequirements).toEqual([
      {
        feature: "object",
        path: ["root"],
        referenceStack: [],
      },
      {
        feature: "local-reference",
        path: ["root", "id"],
        referenceStack: [],
        evidence: {
          targetDefinition: "Count",
        },
      },
      {
        feature: "local-reference",
        path: ["root", "value"],
        referenceStack: [],
        evidence: {
          targetDefinition: "FlexibleValue",
        },
      },
      {
        feature: "union",
        path: ["root", "value"],
        referenceStack: ["FlexibleValue"],
        containingDefinitionName: "FlexibleValue",
      },
      {
        feature: "local-reference",
        path: ["root", "value", "1"],
        referenceStack: ["FlexibleValue"],
        containingDefinitionName: "FlexibleValue",
        evidence: {
          targetDefinition: "FallbackValue",
        },
      },
    ]);

    expect(result.report?.lossHotspots).toEqual([
      {
        code: "integer-widening",
        path: ["root", "id"],
        referenceStack: ["Count"],
        containingDefinitionName: "Count",
        evidence: {
          sourceScalar: "integer",
          renderedScalar: "number",
        },
      },
      {
        code: "unknown-union-absorption",
        path: ["root", "value"],
        referenceStack: ["FlexibleValue"],
        containingDefinitionName: "FlexibleValue",
        evidence: {
          unknownMemberIndexes: [1],
          memberKinds: ["literal", "reference"],
        },
      },
      {
        code: "wide-unknown",
        path: ["root", "value", "1"],
        referenceStack: ["FlexibleValue", "FallbackValue"],
        containingDefinitionName: "FallbackValue",
        evidence: {
          reason: "no-evidence",
          nullable: false,
          renderedForm: "unknown",
          sourceEvidence: {
            source: "parser-json",
            detail: "JSON Schema boolean true was lowered to unknown.",
          },
        },
      },
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
      capabilityRequirements: [
        {
          feature: "object",
          path: ["root"],
          referenceStack: [],
        },
      ],
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
