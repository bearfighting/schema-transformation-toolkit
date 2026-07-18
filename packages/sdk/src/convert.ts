import {
  type ConversionReport,
  type ConversionCapability,
  type ConversionRouteCapabilities,
  type ConversionRoute,
  type ConstraintDocument,
  type GeneratorCapabilities,
  type IrKind,
  type ParserCapabilities,
  type PipelineStage,
  type SemanticLoss,
  type SchemaDiagnostic,
  type SchemaDocument,
  type SchemaSemanticNote,
  type ValueDocument,
} from "@aio/core";
import {
  jsonParserCapabilities,
  parseJsonValueDocumentWithOptions,
  tryInferJsonDocumentFromValueDocumentWithOptions,
  tryInferJsonDocumentWithOptions,
  type JsonParseOptions,
} from "@aio/parser-json";
import {
  jsonSchemaParserCapabilities,
  tryInferJsonSchemaDocumentWithOptions,
  type JsonSchemaParseOptions,
} from "@aio/parser-json-schema";
import {
  typeScriptParserCapabilities,
  tryInferTypeScriptDocumentWithOptions,
  type TypeScriptParseOptions,
} from "@aio/parser-typescript";
import {
  jsonSchemaGeneratorCapabilities,
  tryGenerateJsonSchema,
  type JsonSchemaGeneratorOptions,
  type JsonSchemaOutput,
} from "@aio/generator-json-schema";
import {
  typeScriptGeneratorCapabilities,
  tryGenerateTypeScript,
  type TypeScriptGeneratorOptions,
} from "@aio/generator-typescript";

export type ConversionSourceFormat = "json" | "json-schema" | "typescript";
export type ConversionTargetFormat = "json-schema" | "typescript";

export interface ConvertOptions {
  sourceFormat: ConversionSourceFormat;
  targetFormat: ConversionTargetFormat;
  input: string;
  name?: string;
  includeArtifacts?: boolean;
  parserOptions?: {
    json?: JsonParseOptions;
    jsonSchema?: JsonSchemaParseOptions;
    typeScript?: TypeScriptParseOptions;
  };
  generatorOptions?: {
    jsonSchema?: JsonSchemaGeneratorOptions;
    typeScript?: TypeScriptGeneratorOptions;
  };
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

const PARSER_REGISTRY: Record<ConversionSourceFormat, ParserCapabilities> = {
  json: jsonParserCapabilities,
  "json-schema": jsonSchemaParserCapabilities,
  typescript: typeScriptParserCapabilities,
};

const GENERATOR_REGISTRY: Record<
  ConversionTargetFormat,
  GeneratorCapabilities
> = {
  "json-schema": jsonSchemaGeneratorCapabilities,
  typescript: typeScriptGeneratorCapabilities,
};

export function listConversionRoutes(): ConversionRoute[] {
  const sources: ConversionSourceFormat[] = [
    "json",
    "json-schema",
    "typescript",
  ];
  const targets: ConversionTargetFormat[] = ["json-schema", "typescript"];

  return sources.flatMap((sourceFormat) =>
    targets.map((targetFormat) => planConversion(sourceFormat, targetFormat)),
  );
}

export function planConversion(
  sourceFormat: ConversionSourceFormat,
  targetFormat: ConversionTargetFormat,
): ConversionRoute {
  const parserCapabilities = resolveParserCapabilities(sourceFormat);
  const generatorCapabilities = resolveGeneratorCapabilities(targetFormat);
  const route = buildConversionRoute(
    sourceFormat,
    targetFormat,
    parserCapabilities,
    generatorCapabilities,
  );

  if (route === undefined) {
    throw new Error(
      `Unsupported conversion route: ${sourceFormat} -> ${targetFormat}`,
    );
  }

  return route;
}

export function describeConversionRouteCapabilities(
  sourceFormat: ConversionSourceFormat,
  targetFormat: ConversionTargetFormat,
): ConversionRouteCapabilities {
  const parserCapabilities = resolveParserCapabilities(sourceFormat);
  const generatorCapabilities = resolveGeneratorCapabilities(targetFormat);
  const preservedCapabilities = parserCapabilities.capabilities.filter(
    (capability) =>
      generatorCapabilities.supportsCapabilities.includes(capability),
  );
  const potentiallyLostCapabilities = parserCapabilities.capabilities.filter(
    (capability) =>
      !generatorCapabilities.supportsCapabilities.includes(capability),
  );

  return {
    supportsValueIr: parserCapabilities.producesIr.includes("value"),
    supportsShapeIr:
      parserCapabilities.producesIr.includes("shape") &&
      generatorCapabilities.consumesIr.includes("shape"),
    supportsConstraintIr:
      parserCapabilities.producesIr.includes("constraint") &&
      generatorCapabilities.consumesIr.includes("constraint"),
    parserCapabilities: parserCapabilities.capabilities,
    generatorCapabilities: generatorCapabilities.supportsCapabilities,
    preservedCapabilities,
    potentiallyLostCapabilities,
  };
}

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

  if (options.sourceFormat === "json") {
    const parseResult = parseJsonSource(options.input, name, options);

    if (!parseResult.ok) {
      return {
        ...parseResult,
        plan,
      };
    }

    valueArtifact = parseResult.value;
    shapeArtifact = parseResult.shape;
    diagnostics.push(...parseResult.diagnostics);
    parseDiagnostics.push(...parseResult.diagnostics);
  } else if (options.sourceFormat === "json-schema") {
    const parseResult = tryInferJsonSchemaDocumentWithOptions(options.input, {
      ...options.parserOptions?.jsonSchema,
      name,
    });

    if (!parseResult.ok) {
      return {
        ok: false,
        code: parseResult.code,
        message: parseResult.message,
        phase: "parse",
        plan,
        ...(parseResult.diagnostics
          ? { diagnostics: parseResult.diagnostics }
          : {}),
      };
    }

    shapeArtifact = parseResult.document;
    constraintsArtifact = parseResult.constraints;
    if (parseResult.diagnostics) {
      diagnostics.push(...parseResult.diagnostics);
      parseDiagnostics.push(...parseResult.diagnostics);
    }
    if (parseResult.semanticNotes) {
      semanticNotes.push(...parseResult.semanticNotes);
      parseSemanticNotes.push(...parseResult.semanticNotes);
    }
  } else {
    const parseResult = tryInferTypeScriptDocumentWithOptions(options.input, {
      ...options.parserOptions?.typeScript,
      name,
    });

    if (!parseResult.ok) {
      return {
        ok: false,
        code: parseResult.code,
        message: parseResult.message,
        phase: "parse",
        plan,
        ...(parseResult.diagnostics
          ? { diagnostics: parseResult.diagnostics }
          : {}),
      };
    }

    shapeArtifact = parseResult.document;
    if (parseResult.diagnostics) {
      diagnostics.push(...parseResult.diagnostics);
      parseDiagnostics.push(...parseResult.diagnostics);
    }
    if (parseResult.semanticNotes) {
      semanticNotes.push(...parseResult.semanticNotes);
      parseSemanticNotes.push(...parseResult.semanticNotes);
    }
  }

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

function parseJsonSource(
  input: string,
  name: string,
  options: ConvertOptions,
):
  | {
      ok: true;
      value: ValueDocument;
      shape: SchemaDocument;
      diagnostics: SchemaDiagnostic[];
    }
  | ConvertFailureResult {
  try {
    const value = parseJsonValueDocumentWithOptions(input, {
      ...options.parserOptions?.json,
      name,
    });
    const shapeResult = tryInferJsonDocumentFromValueDocumentWithOptions(
      value,
      {
        ...options.parserOptions?.json,
        name,
      },
    );

    if (!shapeResult.ok) {
      return {
        ok: false,
        code: shapeResult.code,
        message: shapeResult.message,
        phase: "parse",
        plan: planConversion(options.sourceFormat, options.targetFormat),
        ...(shapeResult.diagnostics
          ? { diagnostics: shapeResult.diagnostics }
          : {}),
      };
    }

    return {
      ok: true,
      value,
      shape: shapeResult.document,
      diagnostics: shapeResult.diagnostics ?? [],
    };
  } catch {
    const fallback = tryInferJsonDocumentWithOptions(input, {
      ...options.parserOptions?.json,
      name,
    });

    if (!fallback.ok) {
      return {
        ok: false,
        code: fallback.code,
        message: fallback.message,
        phase: "parse",
        plan: planConversion(options.sourceFormat, options.targetFormat),
        ...(fallback.diagnostics ? { diagnostics: fallback.diagnostics } : {}),
      };
    }

    return {
      ok: true,
      value: parseJsonValueDocumentWithOptions(input, {
        ...options.parserOptions?.json,
        name,
      }),
      shape: fallback.document,
      diagnostics: fallback.diagnostics ?? [],
    };
  }
}

function generateTarget(
  document: SchemaDocument,
  targetFormat: ConversionTargetFormat,
  options: ConvertOptions,
  constraints?: ConstraintDocument,
) {
  if (targetFormat === "typescript") {
    return tryGenerateTypeScript(
      document,
      options.generatorOptions?.typeScript ?? {},
    );
  }

  return tryGenerateJsonSchema(document, {
    ...(options.generatorOptions?.jsonSchema ?? {}),
    ...(constraints ? { constraints } : {}),
  });
}

function defaultDocumentName(sourceFormat: ConversionSourceFormat): string {
  if (sourceFormat === "json") {
    return "JsonDocument";
  }

  if (sourceFormat === "json-schema") {
    return "JsonSchemaDocument";
  }

  return "TypeScriptDocument";
}

function combineDiagnostics(
  diagnostics: SchemaDiagnostic[],
  extraDiagnostics: SchemaDiagnostic[] | undefined,
): SchemaDiagnostic[] | undefined {
  const combined = [...diagnostics, ...(extraDiagnostics ?? [])];

  return combined.length > 0 ? combined : undefined;
}

export function routeUsesIr(route: ConversionRoute, irKind: IrKind): boolean {
  return route.irSequence.includes(irKind);
}

export function routeStages(route: ConversionRoute): PipelineStage[] {
  return route.stages;
}

function buildConversionRoute(
  sourceFormat: ConversionSourceFormat,
  targetFormat: ConversionTargetFormat,
  parserCapabilities: ParserCapabilities,
  generatorCapabilities: GeneratorCapabilities,
): ConversionRoute | undefined {
  if (!parserCapabilities.producesIr.includes("shape")) {
    return undefined;
  }

  if (!generatorCapabilities.consumesIr.includes("shape")) {
    return undefined;
  }

  const irSequence: IrKind[] = [];

  if (
    sourceFormat === "json" &&
    parserCapabilities.producesIr.includes("value")
  ) {
    irSequence.push("value");
  }

  irSequence.push("shape");

  if (
    parserCapabilities.producesIr.includes("constraint") &&
    generatorCapabilities.consumesIr.includes("constraint")
  ) {
    irSequence.push("constraint");
  }

  return {
    sourceFormat,
    targetFormat,
    irSequence,
    stages: buildPipelineStages(
      sourceFormat,
      targetFormat,
      parserCapabilities,
      generatorCapabilities,
    ),
  };
}

function buildPipelineStages(
  sourceFormat: ConversionSourceFormat,
  targetFormat: ConversionTargetFormat,
  parserCapabilities: ParserCapabilities,
  generatorCapabilities: GeneratorCapabilities,
): PipelineStage[] {
  if (sourceFormat === "json") {
    return [
      { kind: "parse-source", from: "json", to: "json-value" },
      { kind: "lower-to-value", from: "json-value", to: "value", ir: "value" },
      { kind: "infer-shape", from: "value", to: "shape", ir: "shape" },
      ...(parserCapabilities.producesIr.includes("constraint") &&
      generatorCapabilities.consumesIr.includes("constraint")
        ? [
            {
              kind: "derive-constraints" as const,
              from: "shape",
              to: "constraint",
              ir: "constraint" as const,
            },
          ]
        : []),
      { kind: "generate-target", from: "shape", to: targetFormat },
    ];
  }

  return [
    { kind: "parse-source", from: sourceFormat, to: "shape", ir: "shape" },
    { kind: "generate-target", from: "shape", to: targetFormat },
  ];
}

function buildConversionReport(
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

function resolveParserCapabilities(
  sourceFormat: ConversionSourceFormat,
): ParserCapabilities {
  return PARSER_REGISTRY[sourceFormat];
}

function resolveGeneratorCapabilities(
  targetFormat: ConversionTargetFormat,
): GeneratorCapabilities {
  return GENERATOR_REGISTRY[targetFormat];
}

function collectPreservedCapabilities(
  sourceFormat: ConversionSourceFormat,
  targetFormat: ConversionTargetFormat,
  valueArtifact: ValueDocument | undefined,
  shapeArtifact: SchemaDocument | undefined,
  constraintsArtifact: ConstraintDocument | undefined,
): ConversionCapability[] {
  const routeCapabilities = describeConversionRouteCapabilities(
    sourceFormat,
    targetFormat,
  );
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

function planSemanticLosses(
  routeCapabilities: ConversionRouteCapabilities,
  constraintsArtifact: ConstraintDocument | undefined,
  targetFormat: ConversionTargetFormat,
  sourceFormat: ConversionSourceFormat,
): SemanticLoss[] {
  return deriveConstraintLosses(
    routeCapabilities,
    constraintsArtifact,
    targetFormat,
    sourceFormat,
  );
}

function deriveConstraintLosses(
  routeCapabilities: ConversionRouteCapabilities,
  constraintsArtifact: ConstraintDocument | undefined,
  targetFormat: ConversionTargetFormat,
  sourceFormat: ConversionSourceFormat,
): SemanticLoss[] {
  if (
    constraintsArtifact === undefined ||
    sourceFormat !== "json-schema" ||
    targetFormat !== "typescript"
  ) {
    return [];
  }

  const seen = new Set<string>();
  const losses: SemanticLoss[] = [];

  for (const entry of constraintsArtifact.entries) {
    for (const item of entry.constraints) {
      const lostCapability = classifyConstraintCapability(item.kind);

      if (
        !routeCapabilities.potentiallyLostCapabilities.includes(lostCapability)
      ) {
        continue;
      }

      const sourcePath = entry.target.path;
      const key = `${lostCapability}:${sourcePath.join("/")}`;

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      losses.push({
        code: "target-cannot-preserve-constraint",
        message: buildConstraintLossMessage(lostCapability, sourcePath),
        severity: "warning",
        phase: "generate",
        lostCapability,
        sourcePath,
        targetFormat,
        evidence: {
          constraintKind: item.kind,
          targetKind: entry.target.kind,
        },
      });
    }
  }

  return losses;
}

function classifyConstraintCapability(
  constraintKind: string,
): ConversionCapability {
  if (
    constraintKind === "pattern" ||
    constraintKind === "minLength" ||
    constraintKind === "maxLength" ||
    constraintKind === "min-length" ||
    constraintKind === "max-length" ||
    constraintKind === "format"
  ) {
    return "string-constraints";
  }

  if (
    constraintKind === "minimum" ||
    constraintKind === "maximum" ||
    constraintKind === "exclusiveMinimum" ||
    constraintKind === "exclusiveMaximum" ||
    constraintKind === "multipleOf" ||
    constraintKind === "exclusive-minimum" ||
    constraintKind === "exclusive-maximum" ||
    constraintKind === "multiple-of"
  ) {
    return "numeric-constraints";
  }

  if (
    constraintKind === "minItems" ||
    constraintKind === "maxItems" ||
    constraintKind === "uniqueItems" ||
    constraintKind === "min-items" ||
    constraintKind === "max-items" ||
    constraintKind === "unique-items"
  ) {
    return "collection-constraints";
  }

  if (
    constraintKind === "closed-object" ||
    constraintKind === "minProperties" ||
    constraintKind === "maxProperties" ||
    constraintKind === "min-properties" ||
    constraintKind === "max-properties"
  ) {
    return "object-constraints";
  }

  return "portable-annotations";
}

function buildConstraintLossMessage(
  lostCapability: ConversionCapability,
  sourcePath: string[],
): string {
  const renderedPath =
    sourcePath.length > 0 ? sourcePath.join(".") : "root constraint target";

  return `TypeScript output cannot preserve ${renderLossCapability(
    lostCapability,
  )} from ${renderedPath}.`;
}

function renderLossCapability(capability: ConversionCapability): string {
  if (capability === "string-constraints") {
    return "string constraints";
  }

  if (capability === "numeric-constraints") {
    return "numeric constraints";
  }

  if (capability === "collection-constraints") {
    return "collection constraints";
  }

  if (capability === "object-constraints") {
    return "object constraints";
  }

  if (capability === "portable-annotations") {
    return "portable annotations";
  }

  if (capability === "constraint-ir") {
    return "constraint IR";
  }

  if (capability === "value-ir") {
    return "value IR";
  }

  return "shape IR";
}
