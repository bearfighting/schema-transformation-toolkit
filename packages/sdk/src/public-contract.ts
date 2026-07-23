import { z } from "zod";

export const conversionSourceFormatSchema = z.enum([
  "json",
  "json-schema",
  "typescript",
]);

export const conversionTargetFormatSchema = z.enum([
  "json-schema",
  "typescript",
]);

export const schemaDiagnosticSchema = z.object({
  severity: z.enum(["error", "warning", "info"]),
  code: z.string(),
  message: z.string(),
  path: z.array(z.string()).optional(),
  nodeKind: z.string().optional(),
  source: z.string().optional(),
  evidence: z.unknown().optional(),
});

export const semanticLossSchema = z.object({
  code: z.string(),
  message: z.string(),
  severity: z.enum(["info", "warning", "error"]),
  phase: z.enum(["parse", "transform", "generate"]),
  lostCapability: z.string(),
  sourcePath: z.array(z.string()).optional(),
  targetFormat: z.string().optional(),
  evidence: z.unknown().optional(),
});

export const conversionRouteSchema = z.object({
  sourceFormat: z.string(),
  targetFormat: z.string(),
  irSequence: z.array(z.enum(["value", "shape", "constraint"])),
  stages: z.array(
    z.object({
      kind: z.enum([
        "parse-source",
        "lower-to-value",
        "infer-shape",
        "derive-constraints",
        "generate-target",
      ]),
      from: z.string(),
      to: z.string(),
      ir: z.enum(["value", "shape", "constraint"]).optional(),
    }),
  ),
});

const conversionReportStageSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    parse: z.array(itemSchema).optional(),
    generate: z.array(itemSchema).optional(),
    all: z.array(itemSchema),
  });

export const conversionSemanticCaveatSchema = z.object({
  phase: z.enum(["parse", "generate"]),
  kind: z.enum(["normalization", "loss", "widening"]),
  code: z.string(),
  message: z.string(),
  source: z.string().optional(),
  path: z.array(z.string()).optional(),
  layer: z.enum(["value", "shape", "constraint", "target"]).optional(),
  evidence: z.unknown().optional(),
});

export const conversionPolicyDecisionSchema = z.object({
  phase: z.enum(["parse", "generate"]),
  code: z.string(),
  message: z.string(),
  source: z.string().optional(),
  path: z.array(z.string()).optional(),
  evidence: z.unknown().optional(),
});

export const conversionEntrySelectionSchema = z.object({
  mode: z.literal("implicit"),
  entry: z.string(),
  strategyCode: z.string(),
  source: z.string().optional(),
  path: z.array(z.string()).optional(),
  evidence: z.unknown().optional(),
});

export const conversionCapabilityRequirementSchema = z.object({
  feature: z.string(),
  path: z.array(z.string()),
  lexicalDefinitionName: z.string().optional(),
  containingDefinitionName: z.string().optional(),
  referenceStack: z.array(z.string()),
  evidence: z.unknown().optional(),
});

export const conversionLossHotspotSchema = z.object({
  code: z.string(),
  path: z.array(z.string()),
  lexicalDefinitionName: z.string().optional(),
  containingDefinitionName: z.string().optional(),
  referenceStack: z.array(z.string()),
  evidence: z.unknown().optional(),
});

export const conversionReportSchema = z.object({
  diagnostics: conversionReportStageSchema(schemaDiagnosticSchema).optional(),
  losses: z.array(semanticLossSchema).optional(),
  preservedCapabilities: z.array(z.string()).optional(),
  semanticNotes: conversionReportStageSchema(
    z.object({
      kind: z.enum(["normalization", "loss", "widening", "policy"]),
      code: z.string(),
      message: z.string(),
      path: z.array(z.string()).optional(),
      nodeKind: z.string().optional(),
      source: z.string().optional(),
      layer: z.enum(["value", "shape", "constraint", "target"]).optional(),
      evidence: z.unknown().optional(),
    }),
  ).optional(),
  semanticCaveats: z.array(conversionSemanticCaveatSchema).optional(),
  capabilityRequirements: z
    .array(conversionCapabilityRequirementSchema)
    .optional(),
  lossHotspots: z.array(conversionLossHotspotSchema).optional(),
  policyDecisions: z.array(conversionPolicyDecisionSchema).optional(),
  entrySelection: conversionEntrySelectionSchema.optional(),
});

export const conversionArtifactsSchema = z
  .object({
    value: z.unknown().optional(),
    shape: z.unknown().optional(),
    constraints: z.unknown().optional(),
  })
  .refine(
    (value) =>
      value.value !== undefined ||
      value.shape !== undefined ||
      value.constraints !== undefined,
    {
      message: "Conversion artifacts must include at least one artifact.",
    },
  );

export const convertSuccessResultSchema = z.object({
  ok: z.literal(true),
  output: z.union([z.string(), z.record(z.string(), z.unknown()), z.boolean()]),
  plan: conversionRouteSchema,
  report: conversionReportSchema.optional(),
  artifacts: conversionArtifactsSchema.optional(),
  diagnostics: z.array(schemaDiagnosticSchema).optional(),
  losses: z.array(semanticLossSchema).optional(),
  preservedCapabilities: z.array(z.string()).optional(),
  semanticNotes: z
    .array(
      z.object({
        kind: z.enum(["normalization", "loss", "widening", "policy"]),
        code: z.string(),
        message: z.string(),
        path: z.array(z.string()).optional(),
        nodeKind: z.string().optional(),
        source: z.string().optional(),
        layer: z.enum(["value", "shape", "constraint", "target"]).optional(),
        evidence: z.unknown().optional(),
      }),
    )
    .optional(),
});

export const convertFailureResultSchema = z.object({
  ok: z.literal(false),
  code: z.string(),
  message: z.string(),
  phase: z.enum(["parse", "generate"]),
  plan: conversionRouteSchema,
  diagnostics: z.array(schemaDiagnosticSchema).optional(),
});

export const publicConvertResultSchema = z.discriminatedUnion("ok", [
  convertSuccessResultSchema,
  convertFailureResultSchema,
]);
