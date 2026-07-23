# API Snapshot: @aio/sdk

Entry: packages/sdk/src/index.ts

## packages/sdk/src/convert.d.ts

```ts
import type { JsonSchemaOutput } from "@aio/generator-json-schema";
import {
  describeConversionRouteCapabilities,
  listConversionRoutes,
  planConversion,
  routeStages,
  routeUsesIr,
} from "./registry.js";
export type {
  ConvertAdvancedOptions,
  ConversionArtifacts,
  ConvertFailureResult,
  ConvertOptions,
  ConvertResult,
  ConvertSuccessResult,
  ConversionSourceFormat,
  ConversionTargetFormat,
} from "./types.js";
import type { ConvertResult, ConvertOptions } from "./types.js";
export {
  describeConversionRouteCapabilities,
  listConversionRoutes,
  planConversion,
  routeStages,
  routeUsesIr,
};
export declare function convert(
  options: ConvertOptions,
): ConvertResult<string | JsonSchemaOutput>;
```

## packages/sdk/src/index.d.ts

```ts
export {
  convert,
  describeConversionRouteCapabilities,
  listConversionRoutes,
  planConversion,
} from "./convert.js";
export {
  conversionArtifactsSchema,
  conversionCapabilityRequirementSchema,
  conversionEntrySelectionSchema,
  conversionLossHotspotSchema,
  conversionPolicyDecisionSchema,
  conversionReportSchema,
  conversionRouteSchema,
  conversionSemanticCaveatSchema,
  convertFailureResultSchema,
  convertSuccessResultSchema,
  publicConvertResultSchema,
  schemaDiagnosticSchema,
  semanticLossSchema,
} from "./public-contract.js";
export { inspectTypeScriptImplicitEntry } from "./inspect.js";
export { collectUserFacingDiagnostics } from "./ui-diagnostics.js";
export { describeFormatSupport, listFormatSupports } from "./support-matrix.js";
export type {
  UserFacingDiagnostic,
  UserFacingSourcePosition,
  UserFacingSourceRange,
} from "./ui-diagnostics.js";
export type {
  TypeScriptImplicitEntryAmbiguityReason,
  TypeScriptImplicitEntryAnalysis,
} from "./inspect.js";
export type {
  ConversionArtifacts,
  ConvertFailureResult,
  ConvertOptions,
  ConvertResult,
  ConvertSuccessResult,
  ConversionSourceFormat,
  ConversionTargetFormat,
} from "./convert.js";
export type {
  ConsumerSurfaceFormat,
  FormatSupportSummary,
  GeneratorSupportSummary,
  ParserSupportSummary,
} from "./support-matrix.js";
```

## packages/sdk/src/public-contract.d.ts

```ts
import { z } from "zod";
export declare const conversionSourceFormatSchema: z.ZodEnum<{
  json: "json";
  "json-schema": "json-schema";
  typescript: "typescript";
}>;
export declare const conversionTargetFormatSchema: z.ZodEnum<{
  "json-schema": "json-schema";
  typescript: "typescript";
}>;
export declare const schemaDiagnosticSchema: z.ZodObject<
  {
    severity: z.ZodEnum<{
      error: "error";
      warning: "warning";
      info: "info";
    }>;
    code: z.ZodString;
    message: z.ZodString;
    path: z.ZodOptional<z.ZodArray<z.ZodString>>;
    nodeKind: z.ZodOptional<z.ZodString>;
    source: z.ZodOptional<z.ZodString>;
    evidence: z.ZodOptional<z.ZodUnknown>;
  },
  z.core.$strip
>;
export declare const semanticLossSchema: z.ZodObject<
  {
    code: z.ZodString;
    message: z.ZodString;
    severity: z.ZodEnum<{
      error: "error";
      warning: "warning";
      info: "info";
    }>;
    phase: z.ZodEnum<{
      parse: "parse";
      transform: "transform";
      generate: "generate";
    }>;
    lostCapability: z.ZodString;
    sourcePath: z.ZodOptional<z.ZodArray<z.ZodString>>;
    targetFormat: z.ZodOptional<z.ZodString>;
    evidence: z.ZodOptional<z.ZodUnknown>;
  },
  z.core.$strip
>;
export declare const conversionRouteSchema: z.ZodObject<
  {
    sourceFormat: z.ZodString;
    targetFormat: z.ZodString;
    irSequence: z.ZodArray<
      z.ZodEnum<{
        value: "value";
        shape: "shape";
        constraint: "constraint";
      }>
    >;
    stages: z.ZodArray<
      z.ZodObject<
        {
          kind: z.ZodEnum<{
            "parse-source": "parse-source";
            "lower-to-value": "lower-to-value";
            "infer-shape": "infer-shape";
            "derive-constraints": "derive-constraints";
            "generate-target": "generate-target";
          }>;
          from: z.ZodString;
          to: z.ZodString;
          ir: z.ZodOptional<
            z.ZodEnum<{
              value: "value";
              shape: "shape";
              constraint: "constraint";
            }>
          >;
        },
        z.core.$strip
      >
    >;
  },
  z.core.$strip
>;
export declare const conversionSemanticCaveatSchema: z.ZodObject<
  {
    phase: z.ZodEnum<{
      parse: "parse";
      generate: "generate";
    }>;
    kind: z.ZodEnum<{
      normalization: "normalization";
      loss: "loss";
      widening: "widening";
    }>;
    code: z.ZodString;
    message: z.ZodString;
    source: z.ZodOptional<z.ZodString>;
    path: z.ZodOptional<z.ZodArray<z.ZodString>>;
    layer: z.ZodOptional<
      z.ZodEnum<{
        value: "value";
        shape: "shape";
        constraint: "constraint";
        target: "target";
      }>
    >;
    evidence: z.ZodOptional<z.ZodUnknown>;
  },
  z.core.$strip
>;
export declare const conversionPolicyDecisionSchema: z.ZodObject<
  {
    phase: z.ZodEnum<{
      parse: "parse";
      generate: "generate";
    }>;
    code: z.ZodString;
    message: z.ZodString;
    source: z.ZodOptional<z.ZodString>;
    path: z.ZodOptional<z.ZodArray<z.ZodString>>;
    evidence: z.ZodOptional<z.ZodUnknown>;
  },
  z.core.$strip
>;
export declare const conversionEntrySelectionSchema: z.ZodObject<
  {
    mode: z.ZodLiteral<"implicit">;
    entry: z.ZodString;
    strategyCode: z.ZodString;
    source: z.ZodOptional<z.ZodString>;
    path: z.ZodOptional<z.ZodArray<z.ZodString>>;
    evidence: z.ZodOptional<z.ZodUnknown>;
  },
  z.core.$strip
>;
export declare const conversionCapabilityRequirementSchema: z.ZodObject<
  {
    feature: z.ZodString;
    path: z.ZodArray<z.ZodString>;
    lexicalDefinitionName: z.ZodOptional<z.ZodString>;
    containingDefinitionName: z.ZodOptional<z.ZodString>;
    referenceStack: z.ZodArray<z.ZodString>;
    evidence: z.ZodOptional<z.ZodUnknown>;
  },
  z.core.$strip
>;
export declare const conversionLossHotspotSchema: z.ZodObject<
  {
    code: z.ZodString;
    path: z.ZodArray<z.ZodString>;
    lexicalDefinitionName: z.ZodOptional<z.ZodString>;
    containingDefinitionName: z.ZodOptional<z.ZodString>;
    referenceStack: z.ZodArray<z.ZodString>;
    evidence: z.ZodOptional<z.ZodUnknown>;
  },
  z.core.$strip
>;
export declare const conversionReportSchema: z.ZodObject<
  {
    diagnostics: z.ZodOptional<
      z.ZodObject<
        {
          parse: z.ZodOptional<
            z.ZodArray<
              z.ZodObject<
                {
                  severity: z.ZodEnum<{
                    error: "error";
                    warning: "warning";
                    info: "info";
                  }>;
                  code: z.ZodString;
                  message: z.ZodString;
                  path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                  nodeKind: z.ZodOptional<z.ZodString>;
                  source: z.ZodOptional<z.ZodString>;
                  evidence: z.ZodOptional<z.ZodUnknown>;
                },
                z.core.$strip
              >
            >
          >;
          generate: z.ZodOptional<
            z.ZodArray<
              z.ZodObject<
                {
                  severity: z.ZodEnum<{
                    error: "error";
                    warning: "warning";
                    info: "info";
                  }>;
                  code: z.ZodString;
                  message: z.ZodString;
                  path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                  nodeKind: z.ZodOptional<z.ZodString>;
                  source: z.ZodOptional<z.ZodString>;
                  evidence: z.ZodOptional<z.ZodUnknown>;
                },
                z.core.$strip
              >
            >
          >;
          all: z.ZodArray<
            z.ZodObject<
              {
                severity: z.ZodEnum<{
                  error: "error";
                  warning: "warning";
                  info: "info";
                }>;
                code: z.ZodString;
                message: z.ZodString;
                path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                nodeKind: z.ZodOptional<z.ZodString>;
                source: z.ZodOptional<z.ZodString>;
                evidence: z.ZodOptional<z.ZodUnknown>;
              },
              z.core.$strip
            >
          >;
        },
        z.core.$strip
      >
    >;
    losses: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            code: z.ZodString;
            message: z.ZodString;
            severity: z.ZodEnum<{
              error: "error";
              warning: "warning";
              info: "info";
            }>;
            phase: z.ZodEnum<{
              parse: "parse";
              transform: "transform";
              generate: "generate";
            }>;
            lostCapability: z.ZodString;
            sourcePath: z.ZodOptional<z.ZodArray<z.ZodString>>;
            targetFormat: z.ZodOptional<z.ZodString>;
            evidence: z.ZodOptional<z.ZodUnknown>;
          },
          z.core.$strip
        >
      >
    >;
    preservedCapabilities: z.ZodOptional<z.ZodArray<z.ZodString>>;
    semanticNotes: z.ZodOptional<
      z.ZodObject<
        {
          parse: z.ZodOptional<
            z.ZodArray<
              z.ZodObject<
                {
                  kind: z.ZodEnum<{
                    normalization: "normalization";
                    loss: "loss";
                    widening: "widening";
                    policy: "policy";
                  }>;
                  code: z.ZodString;
                  message: z.ZodString;
                  path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                  nodeKind: z.ZodOptional<z.ZodString>;
                  source: z.ZodOptional<z.ZodString>;
                  layer: z.ZodOptional<
                    z.ZodEnum<{
                      value: "value";
                      shape: "shape";
                      constraint: "constraint";
                      target: "target";
                    }>
                  >;
                  evidence: z.ZodOptional<z.ZodUnknown>;
                },
                z.core.$strip
              >
            >
          >;
          generate: z.ZodOptional<
            z.ZodArray<
              z.ZodObject<
                {
                  kind: z.ZodEnum<{
                    normalization: "normalization";
                    loss: "loss";
                    widening: "widening";
                    policy: "policy";
                  }>;
                  code: z.ZodString;
                  message: z.ZodString;
                  path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                  nodeKind: z.ZodOptional<z.ZodString>;
                  source: z.ZodOptional<z.ZodString>;
                  layer: z.ZodOptional<
                    z.ZodEnum<{
                      value: "value";
                      shape: "shape";
                      constraint: "constraint";
                      target: "target";
                    }>
                  >;
                  evidence: z.ZodOptional<z.ZodUnknown>;
                },
                z.core.$strip
              >
            >
          >;
          all: z.ZodArray<
            z.ZodObject<
              {
                kind: z.ZodEnum<{
                  normalization: "normalization";
                  loss: "loss";
                  widening: "widening";
                  policy: "policy";
                }>;
                code: z.ZodString;
                message: z.ZodString;
                path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                nodeKind: z.ZodOptional<z.ZodString>;
                source: z.ZodOptional<z.ZodString>;
                layer: z.ZodOptional<
                  z.ZodEnum<{
                    value: "value";
                    shape: "shape";
                    constraint: "constraint";
                    target: "target";
                  }>
                >;
                evidence: z.ZodOptional<z.ZodUnknown>;
              },
              z.core.$strip
            >
          >;
        },
        z.core.$strip
      >
    >;
    semanticCaveats: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            phase: z.ZodEnum<{
              parse: "parse";
              generate: "generate";
            }>;
            kind: z.ZodEnum<{
              normalization: "normalization";
              loss: "loss";
              widening: "widening";
            }>;
            code: z.ZodString;
            message: z.ZodString;
            source: z.ZodOptional<z.ZodString>;
            path: z.ZodOptional<z.ZodArray<z.ZodString>>;
            layer: z.ZodOptional<
              z.ZodEnum<{
                value: "value";
                shape: "shape";
                constraint: "constraint";
                target: "target";
              }>
            >;
            evidence: z.ZodOptional<z.ZodUnknown>;
          },
          z.core.$strip
        >
      >
    >;
    capabilityRequirements: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            feature: z.ZodString;
            path: z.ZodArray<z.ZodString>;
            lexicalDefinitionName: z.ZodOptional<z.ZodString>;
            containingDefinitionName: z.ZodOptional<z.ZodString>;
            referenceStack: z.ZodArray<z.ZodString>;
            evidence: z.ZodOptional<z.ZodUnknown>;
          },
          z.core.$strip
        >
      >
    >;
    lossHotspots: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            code: z.ZodString;
            path: z.ZodArray<z.ZodString>;
            lexicalDefinitionName: z.ZodOptional<z.ZodString>;
            containingDefinitionName: z.ZodOptional<z.ZodString>;
            referenceStack: z.ZodArray<z.ZodString>;
            evidence: z.ZodOptional<z.ZodUnknown>;
          },
          z.core.$strip
        >
      >
    >;
    policyDecisions: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            phase: z.ZodEnum<{
              parse: "parse";
              generate: "generate";
            }>;
            code: z.ZodString;
            message: z.ZodString;
            source: z.ZodOptional<z.ZodString>;
            path: z.ZodOptional<z.ZodArray<z.ZodString>>;
            evidence: z.ZodOptional<z.ZodUnknown>;
          },
          z.core.$strip
        >
      >
    >;
    entrySelection: z.ZodOptional<
      z.ZodObject<
        {
          mode: z.ZodLiteral<"implicit">;
          entry: z.ZodString;
          strategyCode: z.ZodString;
          source: z.ZodOptional<z.ZodString>;
          path: z.ZodOptional<z.ZodArray<z.ZodString>>;
          evidence: z.ZodOptional<z.ZodUnknown>;
        },
        z.core.$strip
      >
    >;
  },
  z.core.$strip
>;
export declare const conversionArtifactsSchema: z.ZodObject<
  {
    value: z.ZodOptional<z.ZodUnknown>;
    shape: z.ZodOptional<z.ZodUnknown>;
    constraints: z.ZodOptional<z.ZodUnknown>;
  },
  z.core.$strip
>;
export declare const convertSuccessResultSchema: z.ZodObject<
  {
    ok: z.ZodLiteral<true>;
    output: z.ZodUnion<
      [z.ZodString, z.ZodRecord<z.ZodString, z.ZodUnknown>, z.ZodBoolean]
    >;
    plan: z.ZodObject<
      {
        sourceFormat: z.ZodString;
        targetFormat: z.ZodString;
        irSequence: z.ZodArray<
          z.ZodEnum<{
            value: "value";
            shape: "shape";
            constraint: "constraint";
          }>
        >;
        stages: z.ZodArray<
          z.ZodObject<
            {
              kind: z.ZodEnum<{
                "parse-source": "parse-source";
                "lower-to-value": "lower-to-value";
                "infer-shape": "infer-shape";
                "derive-constraints": "derive-constraints";
                "generate-target": "generate-target";
              }>;
              from: z.ZodString;
              to: z.ZodString;
              ir: z.ZodOptional<
                z.ZodEnum<{
                  value: "value";
                  shape: "shape";
                  constraint: "constraint";
                }>
              >;
            },
            z.core.$strip
          >
        >;
      },
      z.core.$strip
    >;
    report: z.ZodOptional<
      z.ZodObject<
        {
          diagnostics: z.ZodOptional<
            z.ZodObject<
              {
                parse: z.ZodOptional<
                  z.ZodArray<
                    z.ZodObject<
                      {
                        severity: z.ZodEnum<{
                          error: "error";
                          warning: "warning";
                          info: "info";
                        }>;
                        code: z.ZodString;
                        message: z.ZodString;
                        path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                        nodeKind: z.ZodOptional<z.ZodString>;
                        source: z.ZodOptional<z.ZodString>;
                        evidence: z.ZodOptional<z.ZodUnknown>;
                      },
                      z.core.$strip
                    >
                  >
                >;
                generate: z.ZodOptional<
                  z.ZodArray<
                    z.ZodObject<
                      {
                        severity: z.ZodEnum<{
                          error: "error";
                          warning: "warning";
                          info: "info";
                        }>;
                        code: z.ZodString;
                        message: z.ZodString;
                        path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                        nodeKind: z.ZodOptional<z.ZodString>;
                        source: z.ZodOptional<z.ZodString>;
                        evidence: z.ZodOptional<z.ZodUnknown>;
                      },
                      z.core.$strip
                    >
                  >
                >;
                all: z.ZodArray<
                  z.ZodObject<
                    {
                      severity: z.ZodEnum<{
                        error: "error";
                        warning: "warning";
                        info: "info";
                      }>;
                      code: z.ZodString;
                      message: z.ZodString;
                      path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                      nodeKind: z.ZodOptional<z.ZodString>;
                      source: z.ZodOptional<z.ZodString>;
                      evidence: z.ZodOptional<z.ZodUnknown>;
                    },
                    z.core.$strip
                  >
                >;
              },
              z.core.$strip
            >
          >;
          losses: z.ZodOptional<
            z.ZodArray<
              z.ZodObject<
                {
                  code: z.ZodString;
                  message: z.ZodString;
                  severity: z.ZodEnum<{
                    error: "error";
                    warning: "warning";
                    info: "info";
                  }>;
                  phase: z.ZodEnum<{
                    parse: "parse";
                    transform: "transform";
                    generate: "generate";
                  }>;
                  lostCapability: z.ZodString;
                  sourcePath: z.ZodOptional<z.ZodArray<z.ZodString>>;
                  targetFormat: z.ZodOptional<z.ZodString>;
                  evidence: z.ZodOptional<z.ZodUnknown>;
                },
                z.core.$strip
              >
            >
          >;
          preservedCapabilities: z.ZodOptional<z.ZodArray<z.ZodString>>;
          semanticNotes: z.ZodOptional<
            z.ZodObject<
              {
                parse: z.ZodOptional<
                  z.ZodArray<
                    z.ZodObject<
                      {
                        kind: z.ZodEnum<{
                          normalization: "normalization";
                          loss: "loss";
                          widening: "widening";
                          policy: "policy";
                        }>;
                        code: z.ZodString;
                        message: z.ZodString;
                        path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                        nodeKind: z.ZodOptional<z.ZodString>;
                        source: z.ZodOptional<z.ZodString>;
                        layer: z.ZodOptional<
                          z.ZodEnum<{
                            value: "value";
                            shape: "shape";
                            constraint: "constraint";
                            target: "target";
                          }>
                        >;
                        evidence: z.ZodOptional<z.ZodUnknown>;
                      },
                      z.core.$strip
                    >
                  >
                >;
                generate: z.ZodOptional<
                  z.ZodArray<
                    z.ZodObject<
                      {
                        kind: z.ZodEnum<{
                          normalization: "normalization";
                          loss: "loss";
                          widening: "widening";
                          policy: "policy";
                        }>;
                        code: z.ZodString;
                        message: z.ZodString;
                        path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                        nodeKind: z.ZodOptional<z.ZodString>;
                        source: z.ZodOptional<z.ZodString>;
                        layer: z.ZodOptional<
                          z.ZodEnum<{
                            value: "value";
                            shape: "shape";
                            constraint: "constraint";
                            target: "target";
                          }>
                        >;
                        evidence: z.ZodOptional<z.ZodUnknown>;
                      },
                      z.core.$strip
                    >
                  >
                >;
                all: z.ZodArray<
                  z.ZodObject<
                    {
                      kind: z.ZodEnum<{
                        normalization: "normalization";
                        loss: "loss";
                        widening: "widening";
                        policy: "policy";
                      }>;
                      code: z.ZodString;
                      message: z.ZodString;
                      path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                      nodeKind: z.ZodOptional<z.ZodString>;
                      source: z.ZodOptional<z.ZodString>;
                      layer: z.ZodOptional<
                        z.ZodEnum<{
                          value: "value";
                          shape: "shape";
                          constraint: "constraint";
                          target: "target";
                        }>
                      >;
                      evidence: z.ZodOptional<z.ZodUnknown>;
                    },
                    z.core.$strip
                  >
                >;
              },
              z.core.$strip
            >
          >;
          semanticCaveats: z.ZodOptional<
            z.ZodArray<
              z.ZodObject<
                {
                  phase: z.ZodEnum<{
                    parse: "parse";
                    generate: "generate";
                  }>;
                  kind: z.ZodEnum<{
                    normalization: "normalization";
                    loss: "loss";
                    widening: "widening";
                  }>;
                  code: z.ZodString;
                  message: z.ZodString;
                  source: z.ZodOptional<z.ZodString>;
                  path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                  layer: z.ZodOptional<
                    z.ZodEnum<{
                      value: "value";
                      shape: "shape";
                      constraint: "constraint";
                      target: "target";
                    }>
                  >;
                  evidence: z.ZodOptional<z.ZodUnknown>;
                },
                z.core.$strip
              >
            >
          >;
          capabilityRequirements: z.ZodOptional<
            z.ZodArray<
              z.ZodObject<
                {
                  feature: z.ZodString;
                  path: z.ZodArray<z.ZodString>;
                  lexicalDefinitionName: z.ZodOptional<z.ZodString>;
                  containingDefinitionName: z.ZodOptional<z.ZodString>;
                  referenceStack: z.ZodArray<z.ZodString>;
                  evidence: z.ZodOptional<z.ZodUnknown>;
                },
                z.core.$strip
              >
            >
          >;
          lossHotspots: z.ZodOptional<
            z.ZodArray<
              z.ZodObject<
                {
                  code: z.ZodString;
                  path: z.ZodArray<z.ZodString>;
                  lexicalDefinitionName: z.ZodOptional<z.ZodString>;
                  containingDefinitionName: z.ZodOptional<z.ZodString>;
                  referenceStack: z.ZodArray<z.ZodString>;
                  evidence: z.ZodOptional<z.ZodUnknown>;
                },
                z.core.$strip
              >
            >
          >;
          policyDecisions: z.ZodOptional<
            z.ZodArray<
              z.ZodObject<
                {
                  phase: z.ZodEnum<{
                    parse: "parse";
                    generate: "generate";
                  }>;
                  code: z.ZodString;
                  message: z.ZodString;
                  source: z.ZodOptional<z.ZodString>;
                  path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                  evidence: z.ZodOptional<z.ZodUnknown>;
                },
                z.core.$strip
              >
            >
          >;
          entrySelection: z.ZodOptional<
            z.ZodObject<
              {
                mode: z.ZodLiteral<"implicit">;
                entry: z.ZodString;
                strategyCode: z.ZodString;
                source: z.ZodOptional<z.ZodString>;
                path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                evidence: z.ZodOptional<z.ZodUnknown>;
              },
              z.core.$strip
            >
          >;
        },
        z.core.$strip
      >
    >;
    artifacts: z.ZodOptional<
      z.ZodObject<
        {
          value: z.ZodOptional<z.ZodUnknown>;
          shape: z.ZodOptional<z.ZodUnknown>;
          constraints: z.ZodOptional<z.ZodUnknown>;
        },
        z.core.$strip
      >
    >;
    diagnostics: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            severity: z.ZodEnum<{
              error: "error";
              warning: "warning";
              info: "info";
            }>;
            code: z.ZodString;
            message: z.ZodString;
            path: z.ZodOptional<z.ZodArray<z.ZodString>>;
            nodeKind: z.ZodOptional<z.ZodString>;
            source: z.ZodOptional<z.ZodString>;
            evidence: z.ZodOptional<z.ZodUnknown>;
          },
          z.core.$strip
        >
      >
    >;
    losses: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            code: z.ZodString;
            message: z.ZodString;
            severity: z.ZodEnum<{
              error: "error";
              warning: "warning";
              info: "info";
            }>;
            phase: z.ZodEnum<{
              parse: "parse";
              transform: "transform";
              generate: "generate";
            }>;
            lostCapability: z.ZodString;
            sourcePath: z.ZodOptional<z.ZodArray<z.ZodString>>;
            targetFormat: z.ZodOptional<z.ZodString>;
            evidence: z.ZodOptional<z.ZodUnknown>;
          },
          z.core.$strip
        >
      >
    >;
    preservedCapabilities: z.ZodOptional<z.ZodArray<z.ZodString>>;
    semanticNotes: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            kind: z.ZodEnum<{
              normalization: "normalization";
              loss: "loss";
              widening: "widening";
              policy: "policy";
            }>;
            code: z.ZodString;
            message: z.ZodString;
            path: z.ZodOptional<z.ZodArray<z.ZodString>>;
            nodeKind: z.ZodOptional<z.ZodString>;
            source: z.ZodOptional<z.ZodString>;
            layer: z.ZodOptional<
              z.ZodEnum<{
                value: "value";
                shape: "shape";
                constraint: "constraint";
                target: "target";
              }>
            >;
            evidence: z.ZodOptional<z.ZodUnknown>;
          },
          z.core.$strip
        >
      >
    >;
  },
  z.core.$strip
>;
export declare const convertFailureResultSchema: z.ZodObject<
  {
    ok: z.ZodLiteral<false>;
    code: z.ZodString;
    message: z.ZodString;
    phase: z.ZodEnum<{
      parse: "parse";
      generate: "generate";
    }>;
    plan: z.ZodObject<
      {
        sourceFormat: z.ZodString;
        targetFormat: z.ZodString;
        irSequence: z.ZodArray<
          z.ZodEnum<{
            value: "value";
            shape: "shape";
            constraint: "constraint";
          }>
        >;
        stages: z.ZodArray<
          z.ZodObject<
            {
              kind: z.ZodEnum<{
                "parse-source": "parse-source";
                "lower-to-value": "lower-to-value";
                "infer-shape": "infer-shape";
                "derive-constraints": "derive-constraints";
                "generate-target": "generate-target";
              }>;
              from: z.ZodString;
              to: z.ZodString;
              ir: z.ZodOptional<
                z.ZodEnum<{
                  value: "value";
                  shape: "shape";
                  constraint: "constraint";
                }>
              >;
            },
            z.core.$strip
          >
        >;
      },
      z.core.$strip
    >;
    diagnostics: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            severity: z.ZodEnum<{
              error: "error";
              warning: "warning";
              info: "info";
            }>;
            code: z.ZodString;
            message: z.ZodString;
            path: z.ZodOptional<z.ZodArray<z.ZodString>>;
            nodeKind: z.ZodOptional<z.ZodString>;
            source: z.ZodOptional<z.ZodString>;
            evidence: z.ZodOptional<z.ZodUnknown>;
          },
          z.core.$strip
        >
      >
    >;
  },
  z.core.$strip
>;
export declare const publicConvertResultSchema: z.ZodDiscriminatedUnion<
  [
    z.ZodObject<
      {
        ok: z.ZodLiteral<true>;
        output: z.ZodUnion<
          [z.ZodString, z.ZodRecord<z.ZodString, z.ZodUnknown>, z.ZodBoolean]
        >;
        plan: z.ZodObject<
          {
            sourceFormat: z.ZodString;
            targetFormat: z.ZodString;
            irSequence: z.ZodArray<
              z.ZodEnum<{
                value: "value";
                shape: "shape";
                constraint: "constraint";
              }>
            >;
            stages: z.ZodArray<
              z.ZodObject<
                {
                  kind: z.ZodEnum<{
                    "parse-source": "parse-source";
                    "lower-to-value": "lower-to-value";
                    "infer-shape": "infer-shape";
                    "derive-constraints": "derive-constraints";
                    "generate-target": "generate-target";
                  }>;
                  from: z.ZodString;
                  to: z.ZodString;
                  ir: z.ZodOptional<
                    z.ZodEnum<{
                      value: "value";
                      shape: "shape";
                      constraint: "constraint";
                    }>
                  >;
                },
                z.core.$strip
              >
            >;
          },
          z.core.$strip
        >;
        report: z.ZodOptional<
          z.ZodObject<
            {
              diagnostics: z.ZodOptional<
                z.ZodObject<
                  {
                    parse: z.ZodOptional<
                      z.ZodArray<
                        z.ZodObject<
                          {
                            severity: z.ZodEnum<{
                              error: "error";
                              warning: "warning";
                              info: "info";
                            }>;
                            code: z.ZodString;
                            message: z.ZodString;
                            path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                            nodeKind: z.ZodOptional<z.ZodString>;
                            source: z.ZodOptional<z.ZodString>;
                            evidence: z.ZodOptional<z.ZodUnknown>;
                          },
                          z.core.$strip
                        >
                      >
                    >;
                    generate: z.ZodOptional<
                      z.ZodArray<
                        z.ZodObject<
                          {
                            severity: z.ZodEnum<{
                              error: "error";
                              warning: "warning";
                              info: "info";
                            }>;
                            code: z.ZodString;
                            message: z.ZodString;
                            path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                            nodeKind: z.ZodOptional<z.ZodString>;
                            source: z.ZodOptional<z.ZodString>;
                            evidence: z.ZodOptional<z.ZodUnknown>;
                          },
                          z.core.$strip
                        >
                      >
                    >;
                    all: z.ZodArray<
                      z.ZodObject<
                        {
                          severity: z.ZodEnum<{
                            error: "error";
                            warning: "warning";
                            info: "info";
                          }>;
                          code: z.ZodString;
                          message: z.ZodString;
                          path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                          nodeKind: z.ZodOptional<z.ZodString>;
                          source: z.ZodOptional<z.ZodString>;
                          evidence: z.ZodOptional<z.ZodUnknown>;
                        },
                        z.core.$strip
                      >
                    >;
                  },
                  z.core.$strip
                >
              >;
              losses: z.ZodOptional<
                z.ZodArray<
                  z.ZodObject<
                    {
                      code: z.ZodString;
                      message: z.ZodString;
                      severity: z.ZodEnum<{
                        error: "error";
                        warning: "warning";
                        info: "info";
                      }>;
                      phase: z.ZodEnum<{
                        parse: "parse";
                        transform: "transform";
                        generate: "generate";
                      }>;
                      lostCapability: z.ZodString;
                      sourcePath: z.ZodOptional<z.ZodArray<z.ZodString>>;
                      targetFormat: z.ZodOptional<z.ZodString>;
                      evidence: z.ZodOptional<z.ZodUnknown>;
                    },
                    z.core.$strip
                  >
                >
              >;
              preservedCapabilities: z.ZodOptional<z.ZodArray<z.ZodString>>;
              semanticNotes: z.ZodOptional<
                z.ZodObject<
                  {
                    parse: z.ZodOptional<
                      z.ZodArray<
                        z.ZodObject<
                          {
                            kind: z.ZodEnum<{
                              normalization: "normalization";
                              loss: "loss";
                              widening: "widening";
                              policy: "policy";
                            }>;
                            code: z.ZodString;
                            message: z.ZodString;
                            path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                            nodeKind: z.ZodOptional<z.ZodString>;
                            source: z.ZodOptional<z.ZodString>;
                            layer: z.ZodOptional<
                              z.ZodEnum<{
                                value: "value";
                                shape: "shape";
                                constraint: "constraint";
                                target: "target";
                              }>
                            >;
                            evidence: z.ZodOptional<z.ZodUnknown>;
                          },
                          z.core.$strip
                        >
                      >
                    >;
                    generate: z.ZodOptional<
                      z.ZodArray<
                        z.ZodObject<
                          {
                            kind: z.ZodEnum<{
                              normalization: "normalization";
                              loss: "loss";
                              widening: "widening";
                              policy: "policy";
                            }>;
                            code: z.ZodString;
                            message: z.ZodString;
                            path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                            nodeKind: z.ZodOptional<z.ZodString>;
                            source: z.ZodOptional<z.ZodString>;
                            layer: z.ZodOptional<
                              z.ZodEnum<{
                                value: "value";
                                shape: "shape";
                                constraint: "constraint";
                                target: "target";
                              }>
                            >;
                            evidence: z.ZodOptional<z.ZodUnknown>;
                          },
                          z.core.$strip
                        >
                      >
                    >;
                    all: z.ZodArray<
                      z.ZodObject<
                        {
                          kind: z.ZodEnum<{
                            normalization: "normalization";
                            loss: "loss";
                            widening: "widening";
                            policy: "policy";
                          }>;
                          code: z.ZodString;
                          message: z.ZodString;
                          path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                          nodeKind: z.ZodOptional<z.ZodString>;
                          source: z.ZodOptional<z.ZodString>;
                          layer: z.ZodOptional<
                            z.ZodEnum<{
                              value: "value";
                              shape: "shape";
                              constraint: "constraint";
                              target: "target";
                            }>
                          >;
                          evidence: z.ZodOptional<z.ZodUnknown>;
                        },
                        z.core.$strip
                      >
                    >;
                  },
                  z.core.$strip
                >
              >;
              semanticCaveats: z.ZodOptional<
                z.ZodArray<
                  z.ZodObject<
                    {
                      phase: z.ZodEnum<{
                        parse: "parse";
                        generate: "generate";
                      }>;
                      kind: z.ZodEnum<{
                        normalization: "normalization";
                        loss: "loss";
                        widening: "widening";
                      }>;
                      code: z.ZodString;
                      message: z.ZodString;
                      source: z.ZodOptional<z.ZodString>;
                      path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                      layer: z.ZodOptional<
                        z.ZodEnum<{
                          value: "value";
                          shape: "shape";
                          constraint: "constraint";
                          target: "target";
                        }>
                      >;
                      evidence: z.ZodOptional<z.ZodUnknown>;
                    },
                    z.core.$strip
                  >
                >
              >;
              capabilityRequirements: z.ZodOptional<
                z.ZodArray<
                  z.ZodObject<
                    {
                      feature: z.ZodString;
                      path: z.ZodArray<z.ZodString>;
                      lexicalDefinitionName: z.ZodOptional<z.ZodString>;
                      containingDefinitionName: z.ZodOptional<z.ZodString>;
                      referenceStack: z.ZodArray<z.ZodString>;
                      evidence: z.ZodOptional<z.ZodUnknown>;
                    },
                    z.core.$strip
                  >
                >
              >;
              lossHotspots: z.ZodOptional<
                z.ZodArray<
                  z.ZodObject<
                    {
                      code: z.ZodString;
                      path: z.ZodArray<z.ZodString>;
                      lexicalDefinitionName: z.ZodOptional<z.ZodString>;
                      containingDefinitionName: z.ZodOptional<z.ZodString>;
                      referenceStack: z.ZodArray<z.ZodString>;
                      evidence: z.ZodOptional<z.ZodUnknown>;
                    },
                    z.core.$strip
                  >
                >
              >;
              policyDecisions: z.ZodOptional<
                z.ZodArray<
                  z.ZodObject<
                    {
                      phase: z.ZodEnum<{
                        parse: "parse";
                        generate: "generate";
                      }>;
                      code: z.ZodString;
                      message: z.ZodString;
                      source: z.ZodOptional<z.ZodString>;
                      path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                      evidence: z.ZodOptional<z.ZodUnknown>;
                    },
                    z.core.$strip
                  >
                >
              >;
              entrySelection: z.ZodOptional<
                z.ZodObject<
                  {
                    mode: z.ZodLiteral<"implicit">;
                    entry: z.ZodString;
                    strategyCode: z.ZodString;
                    source: z.ZodOptional<z.ZodString>;
                    path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    evidence: z.ZodOptional<z.ZodUnknown>;
                  },
                  z.core.$strip
                >
              >;
            },
            z.core.$strip
          >
        >;
        artifacts: z.ZodOptional<
          z.ZodObject<
            {
              value: z.ZodOptional<z.ZodUnknown>;
              shape: z.ZodOptional<z.ZodUnknown>;
              constraints: z.ZodOptional<z.ZodUnknown>;
            },
            z.core.$strip
          >
        >;
        diagnostics: z.ZodOptional<
          z.ZodArray<
            z.ZodObject<
              {
                severity: z.ZodEnum<{
                  error: "error";
                  warning: "warning";
                  info: "info";
                }>;
                code: z.ZodString;
                message: z.ZodString;
                path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                nodeKind: z.ZodOptional<z.ZodString>;
                source: z.ZodOptional<z.ZodString>;
                evidence: z.ZodOptional<z.ZodUnknown>;
              },
              z.core.$strip
            >
          >
        >;
        losses: z.ZodOptional<
          z.ZodArray<
            z.ZodObject<
              {
                code: z.ZodString;
                message: z.ZodString;
                severity: z.ZodEnum<{
                  error: "error";
                  warning: "warning";
                  info: "info";
                }>;
                phase: z.ZodEnum<{
                  parse: "parse";
                  transform: "transform";
                  generate: "generate";
                }>;
                lostCapability: z.ZodString;
                sourcePath: z.ZodOptional<z.ZodArray<z.ZodString>>;
                targetFormat: z.ZodOptional<z.ZodString>;
                evidence: z.ZodOptional<z.ZodUnknown>;
              },
              z.core.$strip
            >
          >
        >;
        preservedCapabilities: z.ZodOptional<z.ZodArray<z.ZodString>>;
        semanticNotes: z.ZodOptional<
          z.ZodArray<
            z.ZodObject<
              {
                kind: z.ZodEnum<{
                  normalization: "normalization";
                  loss: "loss";
                  widening: "widening";
                  policy: "policy";
                }>;
                code: z.ZodString;
                message: z.ZodString;
                path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                nodeKind: z.ZodOptional<z.ZodString>;
                source: z.ZodOptional<z.ZodString>;
                layer: z.ZodOptional<
                  z.ZodEnum<{
                    value: "value";
                    shape: "shape";
                    constraint: "constraint";
                    target: "target";
                  }>
                >;
                evidence: z.ZodOptional<z.ZodUnknown>;
              },
              z.core.$strip
            >
          >
        >;
      },
      z.core.$strip
    >,
    z.ZodObject<
      {
        ok: z.ZodLiteral<false>;
        code: z.ZodString;
        message: z.ZodString;
        phase: z.ZodEnum<{
          parse: "parse";
          generate: "generate";
        }>;
        plan: z.ZodObject<
          {
            sourceFormat: z.ZodString;
            targetFormat: z.ZodString;
            irSequence: z.ZodArray<
              z.ZodEnum<{
                value: "value";
                shape: "shape";
                constraint: "constraint";
              }>
            >;
            stages: z.ZodArray<
              z.ZodObject<
                {
                  kind: z.ZodEnum<{
                    "parse-source": "parse-source";
                    "lower-to-value": "lower-to-value";
                    "infer-shape": "infer-shape";
                    "derive-constraints": "derive-constraints";
                    "generate-target": "generate-target";
                  }>;
                  from: z.ZodString;
                  to: z.ZodString;
                  ir: z.ZodOptional<
                    z.ZodEnum<{
                      value: "value";
                      shape: "shape";
                      constraint: "constraint";
                    }>
                  >;
                },
                z.core.$strip
              >
            >;
          },
          z.core.$strip
        >;
        diagnostics: z.ZodOptional<
          z.ZodArray<
            z.ZodObject<
              {
                severity: z.ZodEnum<{
                  error: "error";
                  warning: "warning";
                  info: "info";
                }>;
                code: z.ZodString;
                message: z.ZodString;
                path: z.ZodOptional<z.ZodArray<z.ZodString>>;
                nodeKind: z.ZodOptional<z.ZodString>;
                source: z.ZodOptional<z.ZodString>;
                evidence: z.ZodOptional<z.ZodUnknown>;
              },
              z.core.$strip
            >
          >
        >;
      },
      z.core.$strip
    >,
  ],
  "ok"
>;
```

## packages/sdk/src/inspect.d.ts

```ts
import {
  type TypeScriptImplicitEntryAmbiguityReason,
  type TypeScriptImplicitEntryAnalysis,
} from "@aio/parser-typescript";
export type {
  TypeScriptImplicitEntryAmbiguityReason,
  TypeScriptImplicitEntryAnalysis,
};
export declare function inspectTypeScriptImplicitEntry(
  input: string,
): TypeScriptImplicitEntryAnalysis;
```

## packages/sdk/src/registry.d.ts

```ts
import type {
  ConversionRoute,
  ConversionRouteCapabilities,
  GeneratorCapabilities,
  IrKind,
  ParserCapabilities,
  PipelineStage,
} from "@aio/core";
import type {
  ConversionSourceFormat,
  ConversionTargetFormat,
} from "./types.js";
export declare function listConversionRoutes(): ConversionRoute[];
export declare function planConversion(
  sourceFormat: ConversionSourceFormat,
  targetFormat: ConversionTargetFormat,
): ConversionRoute;
export declare function describeConversionRouteCapabilities(
  sourceFormat: ConversionSourceFormat,
  targetFormat: ConversionTargetFormat,
): ConversionRouteCapabilities;
export declare function routeUsesIr(
  route: ConversionRoute,
  irKind: IrKind,
): boolean;
export declare function routeStages(route: ConversionRoute): PipelineStage[];
export declare function resolveParserCapabilities(
  sourceFormat: ConversionSourceFormat,
): ParserCapabilities;
export declare function resolveGeneratorCapabilities(
  targetFormat: ConversionTargetFormat,
): GeneratorCapabilities;
```

## packages/sdk/src/types.d.ts

```ts
import type {
  ConversionCapability,
  ConversionReport,
  ConstraintDocument,
  SchemaDiagnostic,
  SchemaDocument,
  SchemaSemanticNote,
  SemanticLoss,
  ValueDocument,
  ConversionRoute,
} from "@aio/core";
import type {
  JsonSchemaGeneratorOptions,
  JsonSchemaOutput,
} from "@aio/generator-json-schema";
import type { TypeScriptGeneratorOptions } from "@aio/generator-typescript";
import type { JsonParseOptions } from "@aio/parser-json";
import type { JsonSchemaParseOptions } from "@aio/parser-json-schema";
import type { TypeScriptParseOptions } from "@aio/parser-typescript";
export type ConversionSourceFormat = "json" | "json-schema" | "typescript";
export type ConversionTargetFormat = "json-schema" | "typescript";
export interface ConvertAdvancedOptions {
  parser?: {
    json?: JsonParseOptions;
    jsonSchema?: JsonSchemaParseOptions;
    typeScript?: TypeScriptParseOptions;
  };
  generator?: {
    jsonSchema?: JsonSchemaGeneratorOptions;
    typeScript?: TypeScriptGeneratorOptions;
  };
}
export interface ConvertOptions {
  sourceFormat: ConversionSourceFormat;
  targetFormat: ConversionTargetFormat;
  input: string;
  name?: string;
  includeArtifacts?: boolean;
  advanced?: ConvertAdvancedOptions;
}
export interface ConversionArtifacts {
  value?: ValueDocument;
  shape?: SchemaDocument;
  constraints?: ConstraintDocument;
}
export interface ConvertSuccessResult<TOutput = string | JsonSchemaOutput> {
  ok: true;
  output: TOutput;
  plan: ConversionRoute;
  report?: ConversionReport;
  artifacts?: ConversionArtifacts;
  diagnostics?: SchemaDiagnostic[];
  losses?: SemanticLoss[];
  preservedCapabilities?: ConversionCapability[];
  semanticNotes?: SchemaSemanticNote[];
}
export interface ConvertFailureResult {
  ok: false;
  code: string;
  message: string;
  phase: "parse" | "generate";
  plan: ConversionRoute;
  diagnostics?: SchemaDiagnostic[];
}
export type ConvertResult<TOutput = string | JsonSchemaOutput> =
  ConvertSuccessResult<TOutput> | ConvertFailureResult;
```

## packages/sdk/src/ui-diagnostics.d.ts

```ts
import type { ConvertFailureResult, ConvertResult } from "./types.js";
export interface UserFacingSourcePosition {
  offset: number;
  line: number;
  column: number;
}
export interface UserFacingSourceRange {
  start: UserFacingSourcePosition;
  end: UserFacingSourcePosition;
  length?: number;
}
export interface UserFacingDiagnostic {
  severity: "error" | "warning" | "info";
  code: string;
  title: string;
  message: string;
  path?: string;
  source?: string;
  sourceRange?: UserFacingSourceRange;
  suggestion?: string;
  technicalDetails?: unknown;
}
export declare function collectUserFacingDiagnostics(
  result: ConvertResult,
): UserFacingDiagnostic[];
```

## packages/sdk/src/support-matrix.d.ts

```ts
import type {
  ConversionCapability,
  GeneratorCapabilities,
  ParserCapabilities,
} from "@aio/core";
import type {
  ConversionSourceFormat,
  ConversionTargetFormat,
} from "./types.js";
export type ConsumerSurfaceFormat =
  ConversionSourceFormat | ConversionTargetFormat;
export interface ParserSupportSummary {
  producesIr: ParserCapabilities["producesIr"];
  capabilities: ConversionCapability[];
}
export interface GeneratorSupportSummary {
  consumesIr: GeneratorCapabilities["consumesIr"];
  capabilities: ConversionCapability[];
}
export interface FormatSupportSummary {
  format: ConsumerSurfaceFormat;
  parser?: ParserSupportSummary;
  generator?: GeneratorSupportSummary;
  sharedShapeKinds: string[];
  constraintFamilies: string[];
  notableLimitations: string[];
  experimentalAreas: string[];
}
export declare function describeFormatSupport(
  format: ConsumerSurfaceFormat,
): FormatSupportSummary;
export declare function listFormatSupports(): FormatSupportSummary[];
```
