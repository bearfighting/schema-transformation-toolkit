import type {
  ConfiguredParser,
  PreparedOptions,
  ParseOptions,
  SchemaParser,
} from "@aio/core";
import type { JsonInferenceResult } from "./parse.js";

export type JsonParseStrictness = "strict";
export type JsonNumericMode = "distinguish" | "number-only";
export type JsonEmptyArrayMode = "unknown-array";
export type JsonMixedTypeMode = "error";
export type JsonNullHandling = "nullable";

export interface JsonInferenceOptions {
  numericMode?: JsonNumericMode;
  emptyArrayMode?: JsonEmptyArrayMode;
  mixedTypeMode?: JsonMixedTypeMode;
  nullHandling?: JsonNullHandling;
}

export interface JsonDiagnosticsOptions {
  preserveSourceInfo?: false;
}

export interface JsonParseOptions extends ParseOptions {
  strictness?: JsonParseStrictness;
  inference?: JsonInferenceOptions;
  diagnostics?: JsonDiagnosticsOptions;
}

export interface ResolvedJsonParseOptions {
  name: string;
  strictness: JsonParseStrictness;
  inference: {
    numericMode: JsonNumericMode;
    emptyArrayMode: JsonEmptyArrayMode;
    mixedTypeMode: JsonMixedTypeMode;
    nullHandling: JsonNullHandling;
  };
  diagnostics: {
    preserveSourceInfo: false;
  };
}

export const DEFAULT_JSON_PARSE_OPTIONS: ResolvedJsonParseOptions = {
  name: "JsonDocument",
  strictness: "strict",
  inference: {
    numericMode: "distinguish",
    emptyArrayMode: "unknown-array",
    mixedTypeMode: "error",
    nullHandling: "nullable",
  },
  diagnostics: {
    preserveSourceInfo: false,
  },
};

export function resolveJsonParseOptions(
  options: JsonParseOptions = {},
): ResolvedJsonParseOptions {
  return {
    name: options.name ?? DEFAULT_JSON_PARSE_OPTIONS.name,
    strictness: options.strictness ?? DEFAULT_JSON_PARSE_OPTIONS.strictness,
    inference: {
      numericMode:
        options.inference?.numericMode ??
        DEFAULT_JSON_PARSE_OPTIONS.inference.numericMode,
      emptyArrayMode:
        options.inference?.emptyArrayMode ??
        DEFAULT_JSON_PARSE_OPTIONS.inference.emptyArrayMode,
      mixedTypeMode:
        options.inference?.mixedTypeMode ??
        DEFAULT_JSON_PARSE_OPTIONS.inference.mixedTypeMode,
      nullHandling:
        options.inference?.nullHandling ??
        DEFAULT_JSON_PARSE_OPTIONS.inference.nullHandling,
    },
    diagnostics: {
      preserveSourceInfo:
        options.diagnostics?.preserveSourceInfo ??
        DEFAULT_JSON_PARSE_OPTIONS.diagnostics.preserveSourceInfo,
    },
  };
}

export function assertSupportedJsonParseOptions(
  options: ResolvedJsonParseOptions,
): void {
  const errors = validateJsonParseOptions(options);

  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }
}

export function validateJsonParseOptions(
  options: ResolvedJsonParseOptions,
): string[] {
  const errors: string[] = [];

  if (options.inference.emptyArrayMode !== "unknown-array") {
    errors.push(
      'Unsupported json parse option: inference.emptyArrayMode must currently be "unknown-array".',
    );
  }

  if (options.inference.mixedTypeMode !== "error") {
    errors.push(
      'Unsupported json parse option: inference.mixedTypeMode must currently be "error".',
    );
  }

  if (options.inference.nullHandling !== "nullable") {
    errors.push(
      'Unsupported json parse option: inference.nullHandling must currently be "nullable".',
    );
  }

  if (options.strictness !== "strict") {
    errors.push(
      'Unsupported json parse option: strictness must currently be "strict".',
    );
  }

  if (options.diagnostics.preserveSourceInfo) {
    errors.push(
      "Unsupported json parse option: diagnostics.preserveSourceInfo is not implemented yet.",
    );
  }

  return errors;
}

export function prepareJsonParseOptions(
  options: JsonParseOptions = {},
): PreparedOptions<ResolvedJsonParseOptions> {
  const resolved = resolveJsonParseOptions(options);

  return {
    resolved,
    warnings: [],
    errors: validateJsonParseOptions(resolved),
  };
}

export function createJsonParser(
  parseWithOptions: (
    input: string,
    options: ResolvedJsonParseOptions,
  ) => JsonInferenceResult,
  options: JsonParseOptions = {},
): SchemaParser<string, JsonParseOptions, JsonInferenceResult> {
  return {
    format: "json",
    parse(input, runtimeOptions) {
      return parseWithOptions(
        input,
        resolveJsonParseOptions({
          ...options,
          ...runtimeOptions,
          inference: {
            ...options.inference,
            ...runtimeOptions?.inference,
          },
          diagnostics: {
            ...options.diagnostics,
            ...runtimeOptions?.diagnostics,
          },
        }),
      );
    },
  };
}

export function configureJsonParser(
  parseWithOptions: (
    input: string,
    options: ResolvedJsonParseOptions,
  ) => JsonInferenceResult,
  options: JsonParseOptions = {},
): ConfiguredParser<
  SchemaParser<string, JsonParseOptions, JsonInferenceResult>,
  ResolvedJsonParseOptions
> {
  const prepared = prepareJsonParseOptions(options);

  if (prepared.errors.length > 0) {
    throw new Error(
      `Invalid JSON parser options: ${prepared.errors.join("; ")}`,
    );
  }

  return {
    prepared,
    parser: createJsonParser(parseWithOptions, options),
  };
}
