import type {
  ConstraintDocument,
  ConversionCapability,
  ConversionReport,
  SchemaDiagnostic,
  SchemaDocument,
  SchemaSemanticNote,
  SemanticLoss,
  ValueDocument,
} from "@aio/core";
import { classifyConstraintCapability } from "./losses.js";
import { describeConversionRouteCapabilities } from "./registry.js";
import type {
  ConversionSourceFormat,
  ConversionTargetFormat,
} from "./types.js";

export function buildConversionReport(
  parseDiagnostics: SchemaDiagnostic[],
  generateDiagnostics: SchemaDiagnostic[],
  losses: SemanticLoss[],
  preservedCapabilities: ConversionCapability[],
  parseSemanticNotes: SchemaSemanticNote[],
  generateSemanticNotes: SchemaSemanticNote[],
): ConversionReport | undefined {
  const allDiagnostics = [...parseDiagnostics, ...generateDiagnostics];
  const allSemanticNotes = [...parseSemanticNotes, ...generateSemanticNotes];

  if (
    allDiagnostics.length === 0 &&
    losses.length === 0 &&
    preservedCapabilities.length === 0 &&
    allSemanticNotes.length === 0
  ) {
    return undefined;
  }

  return {
    ...(allDiagnostics.length > 0
      ? {
          diagnostics: {
            ...(parseDiagnostics.length > 0 ? { parse: parseDiagnostics } : {}),
            ...(generateDiagnostics.length > 0
              ? { generate: generateDiagnostics }
              : {}),
            all: allDiagnostics,
          },
        }
      : {}),
    ...(losses.length > 0 ? { losses } : {}),
    ...(preservedCapabilities.length > 0 ? { preservedCapabilities } : {}),
    ...(allSemanticNotes.length > 0
      ? {
          semanticNotes: {
            ...(parseSemanticNotes.length > 0
              ? { parse: parseSemanticNotes }
              : {}),
            ...(generateSemanticNotes.length > 0
              ? { generate: generateSemanticNotes }
              : {}),
            all: allSemanticNotes,
          },
        }
      : {}),
  };
}

export function combineDiagnostics(
  diagnostics: SchemaDiagnostic[],
  extraDiagnostics: SchemaDiagnostic[] | undefined,
): SchemaDiagnostic[] | undefined {
  const combined = [...diagnostics, ...(extraDiagnostics ?? [])];

  return combined.length > 0 ? combined : undefined;
}

export function collectPreservedCapabilities(
  sourceFormat: ConversionSourceFormat,
  targetFormat: ConversionTargetFormat,
  valueArtifact: ValueDocument | undefined,
  shapeArtifact: SchemaDocument | undefined,
  constraintsArtifact: ConstraintDocument | undefined,
): ConversionCapability[] {
  return collectPreservedCapabilitiesFromRoute(
    describeConversionRouteCapabilities(sourceFormat, targetFormat),
    sourceFormat,
    targetFormat,
    valueArtifact,
    shapeArtifact,
    constraintsArtifact,
  );
}

export function collectPreservedCapabilitiesFromRoute(
  routeCapabilities: ReturnType<typeof describeConversionRouteCapabilities>,
  sourceFormat: ConversionSourceFormat,
  targetFormat: ConversionTargetFormat,
  valueArtifact: ValueDocument | undefined,
  shapeArtifact: SchemaDocument | undefined,
  constraintsArtifact: ConstraintDocument | undefined,
): ConversionCapability[] {
  const preserved = new Set<ConversionCapability>();

  if (
    valueArtifact &&
    sourceFormat === "json" &&
    routeCapabilities.parserCapabilities.includes("value-ir")
  ) {
    preserved.add("value-ir");
  }

  if (
    shapeArtifact &&
    routeCapabilities.parserCapabilities.includes("shape-ir") &&
    routeCapabilities.generatorCapabilities.includes("shape-ir")
  ) {
    preserved.add("shape-ir");
  }

  if (
    constraintsArtifact &&
    targetFormat === "json-schema" &&
    routeCapabilities.supportsConstraintIr
  ) {
    preserved.add("constraint-ir");

    for (const entry of constraintsArtifact.entries) {
      for (const item of entry.constraints) {
        preserved.add(classifyConstraintCapability(item.kind));
      }
    }
  }

  return [...preserved];
}
