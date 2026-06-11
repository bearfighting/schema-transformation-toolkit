import type { ParseFailureResult, SchemaDocument } from "@aio/core";
import { schemaDocument } from "@aio/core";
import { decodeJsonText } from "../decode.js";
import { isJsonInferenceError } from "../errors.js";
import { inferSchemaNodeFromJsonValue } from "./infer.js";
import {
  assertSupportedJsonSchemaParseOptions,
  configureJsonSchemaParser,
  resolveJsonSchemaParseOptions,
  type JsonSchemaParseOptions,
  type ResolvedJsonSchemaParseOptions,
} from "./options.js";

export interface JsonSchemaInferenceSuccessResult {
  ok: true;
  document: SchemaDocument;
}

export type JsonSchemaInferenceFailureResult =
  ParseFailureResult<"invalid-json" | "unsupported-mixed-types">;

export type JsonSchemaInferenceResult =
  | JsonSchemaInferenceSuccessResult
  | JsonSchemaInferenceFailureResult;

export function inferJsonSchemaDocument(
  input: string,
  name = "JsonDocument",
): SchemaDocument {
  return inferJsonSchemaDocumentWithResolvedOptions(input, {
    ...resolveJsonSchemaParseOptions(),
    name,
  });
}

export function inferJsonSchemaDocumentWithOptions(
  input: string,
  options: JsonSchemaParseOptions = {},
): SchemaDocument {
  const resolvedOptions = resolveJsonSchemaParseOptions(options);

  assertSupportedJsonSchemaParseOptions(resolvedOptions);

  return inferJsonSchemaDocumentWithResolvedOptions(input, resolvedOptions);
}

export function tryInferJsonSchemaDocument(
  input: string,
  name = "JsonDocument",
): JsonSchemaInferenceResult {
  return tryInferJsonSchemaDocumentWithOptions(input, { name });
}

export function tryInferJsonSchemaDocumentWithOptions(
  input: string,
  options: JsonSchemaParseOptions = {},
): JsonSchemaInferenceResult {
  const resolvedOptions = resolveJsonSchemaParseOptions(options);

  assertSupportedJsonSchemaParseOptions(resolvedOptions);

  return tryInferJsonSchemaDocumentWithResolvedOptions(input, resolvedOptions);
}

const defaultConfiguredJsonSchemaParser = configureJsonSchemaParser(
  (input, options) => tryInferJsonSchemaDocumentWithResolvedOptions(input, options),
);

export const jsonSchemaParser = defaultConfiguredJsonSchemaParser.parser;
export const preparedJsonSchemaParserOptions =
  defaultConfiguredJsonSchemaParser.prepared;

function tryInferJsonSchemaDocumentWithResolvedOptions(
  input: string,
  options: ResolvedJsonSchemaParseOptions,
): JsonSchemaInferenceResult {
  try {
    return {
      ok: true,
      document: inferJsonSchemaDocumentWithResolvedOptions(input, options),
    };
  } catch (error) {
    if (isJsonInferenceError(error)) {
      return {
        ok: false,
        code: error.code,
        message: error.message,
      };
    }

    if (error instanceof SyntaxError) {
      return {
        ok: false,
        code: "invalid-json",
        message: "The input is not valid JSON.",
      };
    }

    throw error;
  }
}

function inferJsonSchemaDocumentWithResolvedOptions(
  input: string,
  options: ResolvedJsonSchemaParseOptions,
): SchemaDocument {
  const decodedValue = decodeJsonText(input);

  return schemaDocument(
    options.name,
    inferSchemaNodeFromJsonValue(decodedValue, options),
  );
}
