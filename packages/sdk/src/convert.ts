import {
  type ConversionRoute,
  type ConstraintDocument,
  type IrKind,
  type PipelineStage,
  type SchemaDiagnostic,
  type SchemaDocument,
  type SchemaSemanticNote,
  schemaDocument,
  valueArrayNode,
  valueDocument,
  valueObjectField,
  valueObjectNode,
  valueScalarNode,
  type ValueDocument,
  type ValueNode,
} from "@aio/core";
import {
  assertSupportedJsonParseOptions,
  inferSchemaNodeFromJsonValue,
  parseJsonValue,
  resolveJsonParseOptions,
  tryInferJsonDocumentWithOptions,
  type JsonParseOptions,
  type JsonValue,
} from "@aio/parser-json";
import {
  tryInferJsonSchemaDocumentWithOptions,
  type JsonSchemaParseOptions,
} from "@aio/parser-json-schema";
import {
  tryInferTypeScriptDocumentWithOptions,
  type TypeScriptParseOptions,
} from "@aio/parser-typescript";
import {
  tryGenerateJsonSchema,
  type JsonSchemaGeneratorOptions,
  type JsonSchemaOutput,
} from "@aio/generator-json-schema";
import {
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
  artifacts?: ConversionArtifacts;
  diagnostics?: SchemaDiagnostic[];
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

const CONVERSION_ROUTES: Record<
  `${ConversionSourceFormat}:${ConversionTargetFormat}`,
  ConversionRoute
> = {
  "json:typescript": {
    sourceFormat: "json",
    targetFormat: "typescript",
    irSequence: ["value", "shape"],
    stages: [
      { kind: "parse-source", from: "json", to: "json-value" },
      { kind: "lower-to-value", from: "json-value", to: "value", ir: "value" },
      { kind: "infer-shape", from: "value", to: "shape", ir: "shape" },
      { kind: "generate-target", from: "shape", to: "typescript" },
    ],
  },
  "json:json-schema": {
    sourceFormat: "json",
    targetFormat: "json-schema",
    irSequence: ["value", "shape"],
    stages: [
      { kind: "parse-source", from: "json", to: "json-value" },
      { kind: "lower-to-value", from: "json-value", to: "value", ir: "value" },
      { kind: "infer-shape", from: "value", to: "shape", ir: "shape" },
      { kind: "generate-target", from: "shape", to: "json-schema" },
    ],
  },
  "json-schema:typescript": {
    sourceFormat: "json-schema",
    targetFormat: "typescript",
    irSequence: ["shape"],
    stages: [
      { kind: "parse-source", from: "json-schema", to: "shape", ir: "shape" },
      { kind: "generate-target", from: "shape", to: "typescript" },
    ],
  },
  "json-schema:json-schema": {
    sourceFormat: "json-schema",
    targetFormat: "json-schema",
    irSequence: ["shape"],
    stages: [
      { kind: "parse-source", from: "json-schema", to: "shape", ir: "shape" },
      { kind: "generate-target", from: "shape", to: "json-schema" },
    ],
  },
  "typescript:typescript": {
    sourceFormat: "typescript",
    targetFormat: "typescript",
    irSequence: ["shape"],
    stages: [
      { kind: "parse-source", from: "typescript", to: "shape", ir: "shape" },
      { kind: "generate-target", from: "shape", to: "typescript" },
    ],
  },
  "typescript:json-schema": {
    sourceFormat: "typescript",
    targetFormat: "json-schema",
    irSequence: ["shape"],
    stages: [
      { kind: "parse-source", from: "typescript", to: "shape", ir: "shape" },
      { kind: "generate-target", from: "shape", to: "json-schema" },
    ],
  },
};

export function listConversionRoutes(): ConversionRoute[] {
  return Object.values(CONVERSION_ROUTES);
}

export function planConversion(
  sourceFormat: ConversionSourceFormat,
  targetFormat: ConversionTargetFormat,
): ConversionRoute {
  const route = CONVERSION_ROUTES[`${sourceFormat}:${targetFormat}`];

  if (route === undefined) {
    throw new Error(
      `Unsupported conversion route: ${sourceFormat} -> ${targetFormat}`,
    );
  }

  return route;
}

export function convert(
  options: ConvertOptions,
): ConvertResult<string | JsonSchemaOutput> {
  const plan = planConversion(options.sourceFormat, options.targetFormat);
  const name = options.name ?? defaultDocumentName(options.sourceFormat);
  const diagnostics: SchemaDiagnostic[] = [];
  const semanticNotes: SchemaSemanticNote[] = [];
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
    }
    if (parseResult.semanticNotes) {
      semanticNotes.push(...parseResult.semanticNotes);
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
    }
    if (parseResult.semanticNotes) {
      semanticNotes.push(...parseResult.semanticNotes);
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
  }
  if (generationResult.semanticNotes) {
    semanticNotes.push(...generationResult.semanticNotes);
  }

  return {
    ok: true,
    output: generationResult.output,
    plan,
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
    const resolvedOptions = resolveJsonParseOptions({
      ...options.parserOptions?.json,
      name,
    });
    assertSupportedJsonParseOptions(resolvedOptions);

    const decodedValue = parseJsonValue(input);
    const diagnostics: SchemaDiagnostic[] = [];
    const shape = schemaDocument(
      name,
      inferSchemaNodeFromJsonValue(decodedValue, resolvedOptions, diagnostics),
    );

    return {
      ok: true,
      value: valueDocument(name, jsonValueToValueNode(decodedValue)),
      shape,
      diagnostics,
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
      value: valueDocument(name, jsonValueToValueNode(parseJsonValue(input))),
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

function jsonValueToValueNode(value: JsonValue): ValueNode {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return valueScalarNode(value);
  }

  if (Array.isArray(value)) {
    return valueArrayNode(value.map((item) => jsonValueToValueNode(item)));
  }

  return valueObjectNode(
    Object.entries(value).map(([name, fieldValue]) =>
      valueObjectField(name, jsonValueToValueNode(fieldValue)),
    ),
  );
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
