import type {
  ConstraintDocument,
  ParseFailureResult,
  SchemaDiagnostic,
  SchemaDocument,
  SchemaSemanticNote,
} from "@aio/core";
import { configureJsonSchemaParser } from "./options.js";
import { convertJsonSchemaToDocument } from "./convert.js";
import { decodeJsonSchemaText } from "./decode.js";
import { isJsonSchemaInferenceError } from "./errors.js";
import {
  assertSupportedJsonSchemaParseOptions,
  resolveJsonSchemaParseOptions,
  type JsonSchemaParseOptions,
  type ResolvedJsonSchemaParseOptions,
} from "./options.js";

export interface JsonSchemaInferenceSuccessResult {
  ok: true;
  document: SchemaDocument;
  constraints?: ConstraintDocument;
  diagnostics?: SchemaDiagnostic[];
  semanticNotes?: SchemaSemanticNote[];
}

export type JsonSchemaInferenceFailureResult = ParseFailureResult<
  | "invalid-json-schema-json"
  | "unsupported-json-schema-draft"
  | "unsupported-json-schema-ref"
  | "unsupported-json-schema-keyword"
  | "unsupported-json-schema-boolean-false"
  | "unsupported-json-schema-closed-object"
  | "unsupported-json-schema-mixed-object-shape"
  | "unsupported-json-schema-type-array"
  | "invalid-json-schema-shape"
  | "unsupported-json-schema-parser-v0"
>;

export type JsonSchemaInferenceResult =
  JsonSchemaInferenceSuccessResult | JsonSchemaInferenceFailureResult;

/** Parses JSON Schema source and returns the inferred schema document or throws on failure. */
export function inferJsonSchemaDocument(
  input: string,
  name = "JsonSchemaDocument",
): SchemaDocument {
  return inferJsonSchemaDocumentWithOptions(input, { name });
}

/** Parses JSON Schema source with explicit parser options and returns the inferred schema document or throws on failure. */
export function inferJsonSchemaDocumentWithOptions(
  input: string,
  options: JsonSchemaParseOptions = {},
): SchemaDocument {
  const result = tryInferJsonSchemaDocumentWithOptions(input, options);

  if (!result.ok) {
    throw new Error(result.message);
  }

  return result.document;
}

/** Parses JSON Schema source and returns a structured success or failure result. */
export function tryInferJsonSchemaDocument(
  input: string,
  name = "JsonSchemaDocument",
): JsonSchemaInferenceResult {
  return tryInferJsonSchemaDocumentWithOptions(input, { name });
}

/** Parses JSON Schema source with explicit parser options and returns a structured success or failure result. */
export function tryInferJsonSchemaDocumentWithOptions(
  input: string,
  options: JsonSchemaParseOptions = {},
): JsonSchemaInferenceResult {
  const resolvedOptions = resolveJsonSchemaParseOptions(options);

  assertSupportedJsonSchemaParseOptions(resolvedOptions);

  return tryInferJsonSchemaDocumentWithResolvedOptions(input, resolvedOptions);
}

const defaultConfiguredJsonSchemaParser = configureJsonSchemaParser(
  (input, options) =>
    tryInferJsonSchemaDocumentWithResolvedOptions(input, options),
);

/** Shared default JSON Schema parser instance using the default v0 options. */
export const jsonSchemaParser = defaultConfiguredJsonSchemaParser.parser;
/** Prepared default option state for the shared JSON Schema parser instance. */
export const preparedJsonSchemaParserOptions =
  defaultConfiguredJsonSchemaParser.prepared;

function tryInferJsonSchemaDocumentWithResolvedOptions(
  input: string,
  options: ResolvedJsonSchemaParseOptions,
): JsonSchemaInferenceResult {
  try {
    const converted = convertJsonSchemaToDocument(
      decodeJsonSchemaText(input),
      options,
    );

    return {
      ok: true,
      document: converted.document,
      ...(converted.constraints.entries.length > 0
        ? { constraints: converted.constraints }
        : {}),
      ...(converted.diagnostics.length > 0
        ? { diagnostics: converted.diagnostics }
        : {}),
      ...(converted.semanticNotes.length > 0
        ? { semanticNotes: converted.semanticNotes }
        : {}),
    };
  } catch (error) {
    if (isJsonSchemaInferenceError(error)) {
      return createFailureResult(
        error.code,
        error.message,
        error.diagnostics ?? [],
      );
    }

    return createFailureResult(
      "unsupported-json-schema-parser-v0",
      "The JSON Schema parser hit an unexpected fallback outside the supported v0 subset.",
      [
        {
          severity: "error",
          code: "unsupported-json-schema-parser-v0",
          message:
            "The JSON Schema parser hit an unexpected fallback outside the supported v0 subset.",
          source: "parser-json-schema",
        },
      ],
    );
  }
}

function createFailureResult(
  code: JsonSchemaInferenceFailureResult["code"],
  message: string,
  diagnostics: SchemaDiagnostic[],
): JsonSchemaInferenceFailureResult {
  return {
    ok: false,
    code,
    message,
    diagnostics,
  };
}
