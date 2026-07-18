import type {
  ConstraintDocument,
  SchemaDiagnostic,
  SchemaDocument,
  SchemaSemanticNote,
  ValueDocument,
} from "@aio/core";
import {
  parseJsonValueDocumentWithOptions,
  tryInferJsonDocumentFromValueDocumentWithOptions,
  tryInferJsonDocumentWithOptions,
} from "@aio/parser-json";
import { tryInferJsonSchemaDocumentWithOptions } from "@aio/parser-json-schema";
import { tryInferTypeScriptDocumentWithOptions } from "@aio/parser-typescript";
import { planConversion } from "./registry.js";
import type {
  ConvertFailureResult,
  ConvertOptions,
  ConversionSourceFormat,
  ConversionTargetFormat,
} from "./types.js";

export interface ParseSourceSuccessResult {
  ok: true;
  value?: ValueDocument;
  shape: SchemaDocument;
  constraints?: ConstraintDocument;
  diagnostics: SchemaDiagnostic[];
  semanticNotes: SchemaSemanticNote[];
}

export type ParseSourceResult = ParseSourceSuccessResult | ConvertFailureResult;

export function parseSource(
  input: string,
  sourceFormat: ConversionSourceFormat,
  targetFormat: ConversionTargetFormat,
  name: string,
  options: ConvertOptions,
): ParseSourceResult {
  if (sourceFormat === "json") {
    return parseJsonSource(input, sourceFormat, targetFormat, name, options);
  }

  if (sourceFormat === "json-schema") {
    const parseResult = tryInferJsonSchemaDocumentWithOptions(input, {
      ...options.parserOptions?.jsonSchema,
      name,
    });

    if (!parseResult.ok) {
      return {
        ok: false,
        code: parseResult.code,
        message: parseResult.message,
        phase: "parse",
        plan: planConversion(sourceFormat, targetFormat),
        ...(parseResult.diagnostics
          ? { diagnostics: parseResult.diagnostics }
          : {}),
      };
    }

    return {
      ok: true,
      shape: parseResult.document,
      diagnostics: parseResult.diagnostics ?? [],
      semanticNotes: parseResult.semanticNotes ?? [],
      ...(parseResult.constraints
        ? { constraints: parseResult.constraints }
        : {}),
    };
  }

  const parseResult = tryInferTypeScriptDocumentWithOptions(input, {
    ...options.parserOptions?.typeScript,
    name,
  });

  if (!parseResult.ok) {
    return {
      ok: false,
      code: parseResult.code,
      message: parseResult.message,
      phase: "parse",
      plan: planConversion(sourceFormat, targetFormat),
      ...(parseResult.diagnostics
        ? { diagnostics: parseResult.diagnostics }
        : {}),
    };
  }

  return {
    ok: true,
    shape: parseResult.document,
    diagnostics: parseResult.diagnostics ?? [],
    semanticNotes: parseResult.semanticNotes ?? [],
  };
}

function parseJsonSource(
  input: string,
  sourceFormat: ConversionSourceFormat,
  targetFormat: ConversionTargetFormat,
  name: string,
  options: ConvertOptions,
): ParseSourceResult {
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
        plan: planConversion(sourceFormat, targetFormat),
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
      semanticNotes: [],
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
        plan: planConversion(sourceFormat, targetFormat),
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
      semanticNotes: [],
    };
  }
}
