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
export type JsonMixedTypeMode = "error" | "union" | "unknown";
export type JsonNullHandling = "nullable";
export type JsonTupleInferenceMode = "off" | "heterogeneous-only";
export type JsonRecordInferenceMode = "off" | "shared-value-type";

export interface JsonDecodeOptions {
  strictness?: JsonParseStrictness;
  diagnostics?: JsonDiagnosticsOptions;
}

export interface JsonInferenceOptions {
  numericMode?: JsonNumericMode;
  emptyArrayMode?: JsonEmptyArrayMode;
  mixedTypeMode?: JsonMixedTypeMode;
  nullHandling?: JsonNullHandling;
  tupleInferenceMode?: JsonTupleInferenceMode;
  recordInferenceMode?: JsonRecordInferenceMode;
}

export interface JsonDiagnosticsOptions {
  preserveSourceInfo?: false;
}

export interface JsonParseOptions extends ParseOptions, JsonDecodeOptions {
  schema?: JsonInferenceOptions;
  inference?: JsonInferenceOptions;
}

export interface ResolvedJsonDecodeOptions {
  strictness: JsonParseStrictness;
  diagnostics: {
    preserveSourceInfo: false;
  };
}

export interface ResolvedJsonParseOptions extends ResolvedJsonDecodeOptions {
  name: string;
  schema: {
    numericMode: JsonNumericMode;
    emptyArrayMode: JsonEmptyArrayMode;
    mixedTypeMode: JsonMixedTypeMode;
    nullHandling: JsonNullHandling;
    tupleInferenceMode: JsonTupleInferenceMode;
    recordInferenceMode: JsonRecordInferenceMode;
  };
  inference: {
    numericMode: JsonNumericMode;
    emptyArrayMode: JsonEmptyArrayMode;
    mixedTypeMode: JsonMixedTypeMode;
    nullHandling: JsonNullHandling;
    tupleInferenceMode: JsonTupleInferenceMode;
    recordInferenceMode: JsonRecordInferenceMode;
  };
}

export const DEFAULT_JSON_DECODE_OPTIONS: ResolvedJsonDecodeOptions = {
  strictness: "strict",
  diagnostics: {
    preserveSourceInfo: false,
  },
};

export const DEFAULT_JSON_PARSE_OPTIONS: ResolvedJsonParseOptions = {
  name: "JsonDocument",
  ...DEFAULT_JSON_DECODE_OPTIONS,
  schema: {
    numericMode: "distinguish",
    emptyArrayMode: "unknown-array",
    mixedTypeMode: "error",
    nullHandling: "nullable",
    tupleInferenceMode: "off",
    recordInferenceMode: "off",
  },
  inference: {
    numericMode: "distinguish",
    emptyArrayMode: "unknown-array",
    mixedTypeMode: "error",
    nullHandling: "nullable",
    tupleInferenceMode: "off",
    recordInferenceMode: "off",
  },
};

export function resolveJsonDecodeOptions(
  options: JsonDecodeOptions = {},
): ResolvedJsonDecodeOptions {
  return {
    strictness: options.strictness ?? DEFAULT_JSON_DECODE_OPTIONS.strictness,
    diagnostics: {
      preserveSourceInfo:
        options.diagnostics?.preserveSourceInfo ??
        DEFAULT_JSON_DECODE_OPTIONS.diagnostics.preserveSourceInfo,
    },
  };
}

export function resolveJsonParseOptions(
  options: JsonParseOptions = {},
): ResolvedJsonParseOptions {
  const normalizedSchemaOptions = {
    ...options.inference,
    ...options.schema,
  };

  const resolvedSchemaOptions = {
    numericMode:
      normalizedSchemaOptions.numericMode ??
      DEFAULT_JSON_PARSE_OPTIONS.schema.numericMode,
    emptyArrayMode:
      normalizedSchemaOptions.emptyArrayMode ??
      DEFAULT_JSON_PARSE_OPTIONS.schema.emptyArrayMode,
    mixedTypeMode:
      normalizedSchemaOptions.mixedTypeMode ??
      DEFAULT_JSON_PARSE_OPTIONS.schema.mixedTypeMode,
    nullHandling:
      normalizedSchemaOptions.nullHandling ??
      DEFAULT_JSON_PARSE_OPTIONS.schema.nullHandling,
    tupleInferenceMode:
      normalizedSchemaOptions.tupleInferenceMode ??
      DEFAULT_JSON_PARSE_OPTIONS.schema.tupleInferenceMode,
    recordInferenceMode:
      normalizedSchemaOptions.recordInferenceMode ??
      DEFAULT_JSON_PARSE_OPTIONS.schema.recordInferenceMode,
  };

  return {
    name: options.name ?? DEFAULT_JSON_PARSE_OPTIONS.name,
    ...resolveJsonDecodeOptions(options),
    schema: resolvedSchemaOptions,
    inference: resolvedSchemaOptions,
  };
}

export function validateJsonDecodeOptions(
  options: ResolvedJsonDecodeOptions,
): string[] {
  const errors: string[] = [];

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

export function validateJsonParseOptions(
  options: ResolvedJsonParseOptions,
): string[] {
  const errors = validateJsonDecodeOptions(options);
  const normalizedSchemaOptions = {
    ...options.schema,
    ...options.inference,
  };

  if (normalizedSchemaOptions.emptyArrayMode !== "unknown-array") {
    errors.push(
      'Unsupported json parse option: inference.emptyArrayMode must currently be "unknown-array".',
    );
  }

  if (
    normalizedSchemaOptions.mixedTypeMode !== "error" &&
    normalizedSchemaOptions.mixedTypeMode !== "union" &&
    normalizedSchemaOptions.mixedTypeMode !== "unknown"
  ) {
    errors.push(
      'Unsupported json parse option: inference.mixedTypeMode must currently be "error", "union", or "unknown".',
    );
  }

  if (normalizedSchemaOptions.nullHandling !== "nullable") {
    errors.push(
      'Unsupported json parse option: inference.nullHandling must currently be "nullable".',
    );
  }

  if (
    normalizedSchemaOptions.tupleInferenceMode !== "off" &&
    normalizedSchemaOptions.tupleInferenceMode !== "heterogeneous-only"
  ) {
    errors.push(
      'Unsupported json parse option: inference.tupleInferenceMode must currently be "off" or "heterogeneous-only".',
    );
  }

  if (
    normalizedSchemaOptions.recordInferenceMode !== "off" &&
    normalizedSchemaOptions.recordInferenceMode !== "shared-value-type"
  ) {
    errors.push(
      'Unsupported json parse option: inference.recordInferenceMode must currently be "off" or "shared-value-type".',
    );
  }

  return errors;
}

export function assertSupportedJsonParseOptions(
  options: ResolvedJsonParseOptions,
): void {
  const errors = validateJsonParseOptions(options);

  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }
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
          diagnostics: {
            ...options.diagnostics,
            ...runtimeOptions?.diagnostics,
          },
          inference: {
            ...options.inference,
            ...runtimeOptions?.inference,
          },
          schema: {
            ...options.inference,
            ...options.schema,
            ...runtimeOptions?.inference,
            ...runtimeOptions?.schema,
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
      `Invalid JSON schema parser options: ${prepared.errors.join("; ")}`,
    );
  }

  return {
    prepared,
    parser: createJsonParser(parseWithOptions, options),
  };
}
