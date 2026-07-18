import type {
  ConstraintDocument,
  SemanticLoss,
  SchemaDiagnostic,
  SchemaDocument,
  SchemaSemanticNote,
  ValueDocument,
} from "@aio/core";
import type { JsonSchemaOutput } from "@aio/generator-json-schema";
import { generateTarget } from "./generate.js";
import { planSemanticLosses } from "./losses.js";
import {
  describeConversionRouteCapabilities,
  listConversionRoutes,
  planConversion,
  routeStages,
  routeUsesIr,
} from "./registry.js";
import {
  buildConversionReport,
  collectPreservedCapabilities,
  combineDiagnostics,
} from "./report.js";
import { parseSource } from "./source.js";
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

export function convert(
  options: ConvertOptions,
): ConvertResult<string | JsonSchemaOutput> {
  const plan = planConversion(options.sourceFormat, options.targetFormat);
  const name = options.name ?? defaultDocumentName(options.sourceFormat);
  const diagnostics: SchemaDiagnostic[] = [];
  const parseDiagnostics: SchemaDiagnostic[] = [];
  const generateDiagnostics: SchemaDiagnostic[] = [];
  const losses: SemanticLoss[] = [];
  const semanticNotes: SchemaSemanticNote[] = [];
  const parseSemanticNotes: SchemaSemanticNote[] = [];
  const generateSemanticNotes: SchemaSemanticNote[] = [];
  let valueArtifact: ValueDocument | undefined;
  let shapeArtifact: SchemaDocument | undefined;
  let constraintsArtifact: ConstraintDocument | undefined;

  const parseResult = parseSource(
    options.input,
    options.sourceFormat,
    options.targetFormat,
    name,
    options,
  );

  if (!parseResult.ok) {
    return {
      ...parseResult,
      plan,
    };
  }

  valueArtifact = parseResult.value;
  shapeArtifact = parseResult.shape;
  constraintsArtifact = parseResult.constraints;
  diagnostics.push(...parseResult.diagnostics);
  parseDiagnostics.push(...parseResult.diagnostics);
  semanticNotes.push(...parseResult.semanticNotes);
  parseSemanticNotes.push(...parseResult.semanticNotes);

  const generationResult = generateTarget(
    shapeArtifact,
    options.targetFormat,
    options,
    constraintsArtifact,
  );

  if (!generationResult.ok) {
    const failureDiagnostics = combineDiagnostics(
      diagnostics,
      generationResult.diagnostics,
    );

    return {
      ok: false,
      code: generationResult.code,
      message: generationResult.message,
      phase: "generate",
      plan,
      ...(failureDiagnostics ? { diagnostics: failureDiagnostics } : {}),
    };
  }

  if (generationResult.diagnostics) {
    diagnostics.push(...generationResult.diagnostics);
    generateDiagnostics.push(...generationResult.diagnostics);
  }
  if (generationResult.semanticNotes) {
    semanticNotes.push(...generationResult.semanticNotes);
    generateSemanticNotes.push(...generationResult.semanticNotes);
  }

  const routeCapabilities = describeConversionRouteCapabilities(
    options.sourceFormat,
    options.targetFormat,
  );

  losses.push(
    ...planSemanticLosses(
      routeCapabilities,
      constraintsArtifact,
      options.targetFormat,
      options.sourceFormat,
    ),
  );

  const preservedCapabilities = collectPreservedCapabilities(
    options.sourceFormat,
    options.targetFormat,
    valueArtifact,
    shapeArtifact,
    constraintsArtifact,
  );

  const report = buildConversionReport(
    parseDiagnostics,
    generateDiagnostics,
    losses,
    preservedCapabilities,
    parseSemanticNotes,
    generateSemanticNotes,
  );

  return {
    ok: true,
    output: generationResult.output,
    plan,
    ...(report ? { report } : {}),
    ...(options.includeArtifacts
      ? {
          artifacts: {
            ...(valueArtifact ? { value: valueArtifact } : {}),
            ...(shapeArtifact ? { shape: shapeArtifact } : {}),
            ...(constraintsArtifact
              ? { constraints: constraintsArtifact }
              : {}),
          },
        }
      : {}),
    ...(diagnostics.length > 0 ? { diagnostics } : {}),
    ...(losses.length > 0 ? { losses } : {}),
    ...(preservedCapabilities.length > 0 ? { preservedCapabilities } : {}),
    ...(semanticNotes.length > 0 ? { semanticNotes } : {}),
  };
}

function defaultDocumentName(
  sourceFormat: ConvertOptions["sourceFormat"],
): string {
  if (sourceFormat === "json") {
    return "JsonDocument";
  }

  if (sourceFormat === "json-schema") {
    return "JsonSchemaDocument";
  }

  return "TypeScriptDocument";
}
