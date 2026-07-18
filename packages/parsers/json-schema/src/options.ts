import type {
  ConfiguredParser,
  ParseOptions,
  PreparedOptions,
  SchemaParser,
} from "@aio/core";
import type { JsonSchemaInferenceResult } from "./api.js";

export type JsonSchemaParseStrictness = "strict";

export interface JsonSchemaDiagnosticsOptions {
  preserveSourceInfo?: false;
}

export interface JsonSchemaParseOptions extends ParseOptions {
  strictness?: JsonSchemaParseStrictness;
  diagnostics?: JsonSchemaDiagnosticsOptions;
}

export interface ResolvedJsonSchemaParseOptions {
  name: string | undefined;
  strictness: JsonSchemaParseStrictness;
  diagnostics: {
    preserveSourceInfo: false;
  };
}

export const DEFAULT_JSON_SCHEMA_PARSE_OPTIONS: ResolvedJsonSchemaParseOptions =
  {
    name: undefined,
    strictness: "strict",
    diagnostics: {
      preserveSourceInfo: false,
    },
  };

export function resolveJsonSchemaParseOptions(
  options: JsonSchemaParseOptions = {},
): ResolvedJsonSchemaParseOptions {
  return {
    name: options.name ?? DEFAULT_JSON_SCHEMA_PARSE_OPTIONS.name,
    strictness:
      options.strictness ?? DEFAULT_JSON_SCHEMA_PARSE_OPTIONS.strictness,
    diagnostics: {
      preserveSourceInfo:
        options.diagnostics?.preserveSourceInfo ??
        DEFAULT_JSON_SCHEMA_PARSE_OPTIONS.diagnostics.preserveSourceInfo,
    },
  };
}

export function validateJsonSchemaParseOptions(
  options: ResolvedJsonSchemaParseOptions,
): string[] {
  const errors: string[] = [];

  if (options.strictness !== "strict") {
    errors.push(
      'Unsupported JSON Schema parse option: strictness must currently be "strict".',
    );
  }

  if (options.diagnostics.preserveSourceInfo) {
    errors.push(
      "Unsupported JSON Schema parse option: diagnostics.preserveSourceInfo is not implemented yet.",
    );
  }

  return errors;
}

export function assertSupportedJsonSchemaParseOptions(
  options: ResolvedJsonSchemaParseOptions,
): void {
  const errors = validateJsonSchemaParseOptions(options);

  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }
}

export function prepareJsonSchemaParseOptions(
  options: JsonSchemaParseOptions = {},
): PreparedOptions<ResolvedJsonSchemaParseOptions> {
  const resolved = resolveJsonSchemaParseOptions(options);

  return {
    resolved,
    warnings: [],
    errors: validateJsonSchemaParseOptions(resolved),
  };
}

export function createJsonSchemaParser(
  parseWithOptions: (
    input: string,
    options: ResolvedJsonSchemaParseOptions,
  ) => JsonSchemaInferenceResult,
  options: JsonSchemaParseOptions = {},
): SchemaParser<string, JsonSchemaParseOptions, JsonSchemaInferenceResult> {
  return {
    format: "json-schema",
    parse(input, runtimeOptions) {
      return parseWithOptions(
        input,
        resolveJsonSchemaParseOptions({
          ...options,
          ...runtimeOptions,
          diagnostics: {
            ...options.diagnostics,
            ...runtimeOptions?.diagnostics,
          },
        }),
      );
    },
  };
}

export function configureJsonSchemaParser(
  parseWithOptions: (
    input: string,
    options: ResolvedJsonSchemaParseOptions,
  ) => JsonSchemaInferenceResult,
  options: JsonSchemaParseOptions = {},
): ConfiguredParser<
  SchemaParser<string, JsonSchemaParseOptions, JsonSchemaInferenceResult>,
  ResolvedJsonSchemaParseOptions
> {
  const prepared = prepareJsonSchemaParseOptions(options);

  if (prepared.errors.length > 0) {
    throw new Error(
      `Invalid JSON Schema parser options: ${prepared.errors.join("; ")}`,
    );
  }

  return {
    prepared,
    parser: createJsonSchemaParser(parseWithOptions, options),
  };
}
