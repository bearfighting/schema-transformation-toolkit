import type {
  ConversionCapabilityRequirement,
  ConversionEntrySelection,
  ConversionLossHotspot,
  ConversionPolicyDecision,
  ConversionSemanticCaveat,
  ConstraintDocument,
  ConversionCapability,
  ConversionIrSelection,
  ConversionReport,
  SchemaDiagnostic,
  SchemaDocument,
  SchemaSemanticNote,
  SemanticLoss,
  ValueDocument,
} from "@schema-transformation-toolkit/core";
import { classifyConstraintCapability } from "./losses.js";
import { describeConversionRouteCapabilities } from "./registry.js";
import type {
  ConversionSourceFormat,
  ConversionTargetFormat,
} from "./types.js";
import type { ConversionRegistry } from "./types.js";

type TargetSemanticCaveatNote = SchemaSemanticNote & {
  kind: Exclude<SchemaSemanticNote["kind"], "policy">;
  layer: "target";
};

export interface ConversionReportEvidence {
  diagnostics: {
    parse: SchemaDiagnostic[];
    transform: SchemaDiagnostic[];
    generate: SchemaDiagnostic[];
  };
  semanticNotes: {
    parse: SchemaSemanticNote[];
    transform: SchemaSemanticNote[];
    generate: SchemaSemanticNote[];
  };
  losses: SemanticLoss[];
  preservedCapabilities: ConversionCapability[];
  capabilityRequirements?: ConversionCapabilityRequirement[];
  lossHotspots?: ConversionLossHotspot[];
  irSelection?: ConversionIrSelection;
}

export function buildConversionReport(
  evidence: ConversionReportEvidence,
): ConversionReport | undefined {
  const {
    diagnostics: {
      parse: parseDiagnostics,
      transform: transformDiagnostics,
      generate: generateDiagnostics,
    },
    semanticNotes: {
      parse: parseSemanticNotes,
      transform: transformSemanticNotes,
      generate: generateSemanticNotes,
    },
    losses,
    preservedCapabilities,
    capabilityRequirements = [],
    lossHotspots = [],
    irSelection,
  } = evidence;
  const allDiagnostics = [
    ...parseDiagnostics,
    ...transformDiagnostics,
    ...generateDiagnostics,
  ];
  const allSemanticNotes = [
    ...parseSemanticNotes,
    ...transformSemanticNotes,
    ...generateSemanticNotes,
  ];
  const policyDecisions = extractPolicyDecisions(
    parseSemanticNotes,
    transformSemanticNotes,
    generateSemanticNotes,
  );
  const semanticCaveats = extractSemanticCaveats(
    parseSemanticNotes,
    transformSemanticNotes,
    generateSemanticNotes,
  );
  const entrySelection = extractEntrySelection(policyDecisions);

  if (
    allDiagnostics.length === 0 &&
    losses.length === 0 &&
    preservedCapabilities.length === 0 &&
    allSemanticNotes.length === 0 &&
    semanticCaveats.length === 0 &&
    capabilityRequirements.length === 0 &&
    lossHotspots.length === 0 &&
    policyDecisions.length === 0 &&
    !entrySelection &&
    !irSelection
  ) {
    return undefined;
  }

  return {
    ...(irSelection ? { irSelection } : {}),
    ...(allDiagnostics.length > 0
      ? {
          diagnostics: {
            ...(parseDiagnostics.length > 0 ? { parse: parseDiagnostics } : {}),
            ...(transformDiagnostics.length > 0
              ? { transform: transformDiagnostics }
              : {}),
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
            ...(transformSemanticNotes.length > 0
              ? { transform: transformSemanticNotes }
              : {}),
            ...(generateSemanticNotes.length > 0
              ? { generate: generateSemanticNotes }
              : {}),
            all: allSemanticNotes,
          },
        }
      : {}),
    ...(semanticCaveats.length > 0 ? { semanticCaveats } : {}),
    ...(capabilityRequirements.length > 0 ? { capabilityRequirements } : {}),
    ...(lossHotspots.length > 0 ? { lossHotspots } : {}),
    ...(policyDecisions.length > 0 ? { policyDecisions } : {}),
    ...(entrySelection ? { entrySelection } : {}),
  };
}

export function combineDiagnostics(
  diagnostics: SchemaDiagnostic[],
  extraDiagnostics: SchemaDiagnostic[] | undefined,
): SchemaDiagnostic[] | undefined {
  const combined = [...diagnostics, ...(extraDiagnostics ?? [])];

  return combined.length > 0 ? combined : undefined;
}

export function extractEntrySelection(
  policyDecisions: ConversionPolicyDecision[],
): ConversionEntrySelection | undefined {
  const entrySelectionDecision = policyDecisions.find(
    (decision) =>
      decision.phase === "parse" &&
      (decision.code === "typescript-implicit-entry-selected" ||
        decision.code === "csharp-implicit-entry-selected"),
  );

  if (!entrySelectionDecision) {
    return undefined;
  }

  const evidence =
    entrySelectionDecision.evidence &&
    typeof entrySelectionDecision.evidence === "object" &&
    !Array.isArray(entrySelectionDecision.evidence)
      ? entrySelectionDecision.evidence
      : undefined;
  const entry =
    evidence && "entry" in evidence && typeof evidence.entry === "string"
      ? evidence.entry
      : entrySelectionDecision.path?.[1];
  const strategyCode =
    evidence &&
    "selectionReason" in evidence &&
    typeof evidence.selectionReason === "string"
      ? evidence.selectionReason
      : entrySelectionDecision.code;

  if (!entry) {
    return undefined;
  }

  return {
    mode: "implicit",
    entry,
    strategyCode,
    ...(entrySelectionDecision.source
      ? { source: entrySelectionDecision.source }
      : {}),
    ...(entrySelectionDecision.path
      ? { path: entrySelectionDecision.path }
      : {}),
    ...(entrySelectionDecision.evidence
      ? { evidence: entrySelectionDecision.evidence }
      : {}),
  };
}

export function extractPolicyDecisions(
  parseSemanticNotes: SchemaSemanticNote[],
  transformSemanticNotes: SchemaSemanticNote[] = [],
  generateSemanticNotes: SchemaSemanticNote[] = [],
): ConversionPolicyDecision[] {
  return [
    ...parseSemanticNotes
      .filter((note) => note.kind === "policy")
      .map((note) => ({
        phase: "parse" as const,
        code: note.code,
        message: note.message,
        ...(note.source ? { source: note.source } : {}),
        ...(note.path ? { path: note.path } : {}),
        ...(note.evidence ? { evidence: note.evidence } : {}),
      })),
    ...transformSemanticNotes
      .filter((note) => note.kind === "policy")
      .map((note) => ({
        phase: "transform" as const,
        code: note.code,
        message: note.message,
        ...(note.source ? { source: note.source } : {}),
        ...(note.path ? { path: note.path } : {}),
        ...(note.evidence ? { evidence: note.evidence } : {}),
      })),
    ...generateSemanticNotes
      .filter((note) => note.kind === "policy")
      .map((note) => ({
        phase: "generate" as const,
        code: note.code,
        message: note.message,
        ...(note.source ? { source: note.source } : {}),
        ...(note.path ? { path: note.path } : {}),
        ...(note.evidence ? { evidence: note.evidence } : {}),
      })),
  ];
}

export function extractSemanticCaveats(
  parseSemanticNotes: SchemaSemanticNote[],
  transformSemanticNotes: SchemaSemanticNote[] = [],
  generateSemanticNotes: SchemaSemanticNote[] = [],
): ConversionSemanticCaveat[] {
  return [
    ...parseSemanticNotes
      .filter(isTargetSemanticCaveatNote)
      .map((note) => toSemanticCaveat("parse", note)),
    ...transformSemanticNotes
      .filter(isTargetSemanticCaveatNote)
      .map((note) => toSemanticCaveat("transform", note)),
    ...generateSemanticNotes
      .filter(isTargetSemanticCaveatNote)
      .map((note) => toSemanticCaveat("generate", note)),
  ];
}

function toSemanticCaveat(
  phase: "parse" | "transform" | "generate",
  note: TargetSemanticCaveatNote,
): ConversionSemanticCaveat {
  return {
    phase,
    kind: note.kind,
    code: note.code,
    message: note.message,
    ...(note.source ? { source: note.source } : {}),
    ...(note.path ? { path: note.path } : {}),
    ...(note.layer ? { layer: note.layer } : {}),
    ...(note.evidence ? { evidence: note.evidence } : {}),
  };
}

function isTargetSemanticCaveatNote(
  note: SchemaSemanticNote,
): note is TargetSemanticCaveatNote {
  return note.kind !== "policy" && note.layer === "target";
}

export function collectPreservedCapabilities(
  sourceFormat: ConversionSourceFormat,
  targetFormat: ConversionTargetFormat,
  valueArtifact: ValueDocument | undefined,
  shapeArtifact: SchemaDocument | undefined,
  constraintsArtifact: ConstraintDocument | undefined,
  registry?: ConversionRegistry,
): ConversionCapability[] {
  return collectPreservedCapabilitiesFromRoute(
    describeConversionRouteCapabilities(sourceFormat, targetFormat, registry),
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
    (targetFormat === "json-schema" || targetFormat === "zod") &&
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
