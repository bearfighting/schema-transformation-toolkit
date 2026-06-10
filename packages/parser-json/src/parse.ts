import type { SchemaDocument } from "@aio/core";
import { isJsonInferenceError, JsonInferenceError } from "./errors.js";
import { inferJsonType } from "./infer.js";
import { schemaDocument } from "@aio/core";
import {
  assertSupportedJsonParseOptions,
  configureJsonParser,
  createJsonParser,
  prepareJsonParseOptions,
  resolveJsonParseOptions,
  validateJsonParseOptions,
  type JsonParseOptions,
  type ResolvedJsonParseOptions
} from "./options.js";
import type { JsonValue } from "./types.js";

export interface JsonInferenceSuccessResult {
  ok: true;
  document: SchemaDocument;
}

export interface JsonInferenceFailureResult {
  ok: false;
  code:
    | "invalid-json"
    | "unsupported-top-level-null"
    | "unsupported-empty-array"
    | "unsupported-null-only-field"
    | "unsupported-empty-array-only-field"
    | "unsupported-mixed-types";
  message: string;
}

export type JsonInferenceResult = JsonInferenceSuccessResult | JsonInferenceFailureResult;

export function inferJsonDocument(input: string, name = "JsonDocument"): SchemaDocument {
  const parsed = parseJsonValue(input);

  return schemaDocument(name, inferJsonType(parsed));
}

export function inferJsonDocumentWithOptions(
  input: string,
  options: JsonParseOptions = {}
): SchemaDocument {
  const resolvedOptions = resolveJsonParseOptions(options);

  assertSupportedJsonParseOptions(resolvedOptions);

  return inferJsonDocument(input, resolvedOptions.name);
}

export function tryInferJsonDocument(
  input: string,
  name = "JsonDocument"
): JsonInferenceResult {
  return tryInferJsonDocumentWithOptions(input, { name });
}

export function tryInferJsonDocumentWithOptions(
  input: string,
  options: JsonParseOptions = {}
): JsonInferenceResult {
  const resolvedOptions = resolveJsonParseOptions(options);

  assertSupportedJsonParseOptions(resolvedOptions);

  try {
    return {
      ok: true,
      document: inferJsonDocumentWithResolvedOptions(input, resolvedOptions)
    };
  } catch (error) {
    if (isJsonInferenceError(error)) {
      return {
        ok: false,
        code: error.code,
        message: error.message
      };
    }

    if (error instanceof SyntaxError) {
      return {
        ok: false,
        code: "invalid-json",
        message: "The input is not valid JSON."
      };
    }

    throw error;
  }
}

export function parseJsonValue(input: string): JsonValue {
  try {
    return JSON.parse(input) as JsonValue;
  } catch {
    throw new JsonInferenceError("invalid-json", "The input is not valid JSON.");
  }
}

const defaultConfiguredJsonParser = configureJsonParser(
  (input, options) => tryInferJsonDocumentWithResolvedOptions(input, options)
);

export const jsonSchemaParser = defaultConfiguredJsonParser.parser;
export const preparedJsonSchemaParserOptions = defaultConfiguredJsonParser.prepared;

function tryInferJsonDocumentWithResolvedOptions(
  input: string,
  options: ResolvedJsonParseOptions
): JsonInferenceResult {
  try {
    return {
      ok: true,
      document: inferJsonDocumentWithResolvedOptions(input, options)
    };
  } catch (error) {
    if (isJsonInferenceError(error)) {
      return {
        ok: false,
        code: error.code,
        message: error.message
      };
    }

    if (error instanceof SyntaxError) {
      return {
        ok: false,
        code: "invalid-json",
        message: "The input is not valid JSON."
      };
    }

    throw error;
  }
}

function inferJsonDocumentWithResolvedOptions(
  input: string,
  options: ResolvedJsonParseOptions
): SchemaDocument {
  const parsed = parseJsonValue(input);

  return schemaDocument(options.name, inferJsonType(parsed));
}
