import type {
  ParseFailureResult,
  SchemaDiagnostic,
  SchemaDocument,
} from "@aio/core";
import { schemaDocument } from "@aio/core";
import { decodeJsonText } from "../decode.js";
import { isJsonInferenceError } from "../errors.js";
import { inferSchemaNodeFromJsonValue } from "./infer.js";
import {
  assertSupportedJsonParseOptions,
  configureJsonParser,
  resolveJsonParseOptions,
  type JsonParseOptions,
  type ResolvedJsonParseOptions,
} from "./options.js";

export interface JsonInferenceSuccessResult {
  ok: true;
  document: SchemaDocument;
  diagnostics?: SchemaDiagnostic[];
}

export type JsonInferenceFailureResult = ParseFailureResult<
  "invalid-json" | "unsupported-mixed-types"
>;

export type JsonInferenceResult =
  JsonInferenceSuccessResult | JsonInferenceFailureResult;

/** Parses JSON text and returns the inferred schema document or throws on failure. */
export function inferJsonDocument(
  input: string,
  name = "JsonDocument",
): SchemaDocument {
  return inferJsonDocumentWithResolvedOptions(input, {
    ...resolveJsonParseOptions(),
    name,
  });
}

/** Parses JSON text with explicit parser options and returns the inferred schema document or throws on failure. */
export function inferJsonDocumentWithOptions(
  input: string,
  options: JsonParseOptions = {},
): SchemaDocument {
  const resolvedOptions = resolveJsonParseOptions(options);

  assertSupportedJsonParseOptions(resolvedOptions);

  return inferJsonDocumentWithResolvedOptions(input, resolvedOptions);
}

/** Parses JSON text and returns a structured success or failure result. */
export function tryInferJsonDocument(
  input: string,
  name = "JsonDocument",
): JsonInferenceResult {
  return tryInferJsonDocumentWithOptions(input, { name });
}

/** Parses JSON text with explicit parser options and returns a structured success or failure result. */
export function tryInferJsonDocumentWithOptions(
  input: string,
  options: JsonParseOptions = {},
): JsonInferenceResult {
  const resolvedOptions = resolveJsonParseOptions(options);

  assertSupportedJsonParseOptions(resolvedOptions);

  return tryInferJsonDocumentWithResolvedOptions(input, resolvedOptions);
}

const defaultConfiguredJsonParser = configureJsonParser((input, options) =>
  tryInferJsonDocumentWithResolvedOptions(input, options),
);

/** Shared default JSON parser instance using the default v0 options. */
export const jsonParser = defaultConfiguredJsonParser.parser;
/** Prepared default option state for the shared JSON parser instance. */
export const preparedJsonParserOptions = defaultConfiguredJsonParser.prepared;

function tryInferJsonDocumentWithResolvedOptions(
  input: string,
  options: ResolvedJsonParseOptions,
): JsonInferenceResult {
  try {
    const diagnostics: SchemaDiagnostic[] = [];

    return {
      ok: true,
      document: inferJsonDocumentWithResolvedOptions(
        input,
        options,
        diagnostics,
      ),
      ...(diagnostics.length > 0 ? { diagnostics } : {}),
    };
  } catch (error) {
    if (isJsonInferenceError(error)) {
      return {
        ok: false,
        code: error.code,
        message: error.message,
        ...(error.diagnostics && error.diagnostics.length > 0
          ? { diagnostics: error.diagnostics }
          : {}),
      };
    }

    if (error instanceof SyntaxError) {
      return {
        ok: false,
        code: "invalid-json",
        message: "The input is not valid JSON.",
        diagnostics: [
          {
            severity: "error",
            code: "invalid-json",
            message: "The input is not valid JSON.",
            source: "parser-json",
          },
        ],
      };
    }

    throw error;
  }
}

function inferJsonDocumentWithResolvedOptions(
  input: string,
  options: ResolvedJsonParseOptions,
  diagnostics: SchemaDiagnostic[] = [],
): SchemaDocument {
  const decodedValue = decodeJsonText(input);

  return schemaDocument(
    options.name,
    inferSchemaNodeFromJsonValue(decodedValue, options, diagnostics),
  );
}
