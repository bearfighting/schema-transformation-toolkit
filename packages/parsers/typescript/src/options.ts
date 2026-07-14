import type {
  ConfiguredParser,
  ParseOptions,
  PreparedOptions,
  SchemaParser,
} from "@aio/core";
import type { TypeScriptInferenceResult } from "./parse.js";

export type TypeScriptParseStrictness = "strict";

export interface TypeScriptDiagnosticsOptions {
  preserveSourceInfo?: false;
}

export interface TypeScriptParseOptions extends ParseOptions {
  entry?: string;
  strictness?: TypeScriptParseStrictness;
  diagnostics?: TypeScriptDiagnosticsOptions;
}

export interface ResolvedTypeScriptParseOptions {
  name: string;
  entry: string | undefined;
  strictness: TypeScriptParseStrictness;
  diagnostics: {
    preserveSourceInfo: false;
  };
}

export const DEFAULT_TYPESCRIPT_PARSE_OPTIONS: ResolvedTypeScriptParseOptions =
  {
    name: "TypeScriptDocument",
    entry: undefined,
    strictness: "strict",
    diagnostics: {
      preserveSourceInfo: false,
    },
  };

export function resolveTypeScriptParseOptions(
  options: TypeScriptParseOptions = {},
): ResolvedTypeScriptParseOptions {
  return {
    name: options.name ?? DEFAULT_TYPESCRIPT_PARSE_OPTIONS.name,
    entry: options.entry ?? DEFAULT_TYPESCRIPT_PARSE_OPTIONS.entry,
    strictness:
      options.strictness ?? DEFAULT_TYPESCRIPT_PARSE_OPTIONS.strictness,
    diagnostics: {
      preserveSourceInfo:
        options.diagnostics?.preserveSourceInfo ??
        DEFAULT_TYPESCRIPT_PARSE_OPTIONS.diagnostics.preserveSourceInfo,
    },
  };
}

export function validateTypeScriptParseOptions(
  options: ResolvedTypeScriptParseOptions,
): string[] {
  const errors: string[] = [];

  if (options.strictness !== "strict") {
    errors.push(
      'Unsupported TypeScript parse option: strictness must currently be "strict".',
    );
  }

  if (options.diagnostics.preserveSourceInfo) {
    errors.push(
      "Unsupported TypeScript parse option: diagnostics.preserveSourceInfo is not implemented yet.",
    );
  }

  return errors;
}

export function assertSupportedTypeScriptParseOptions(
  options: ResolvedTypeScriptParseOptions,
): void {
  const errors = validateTypeScriptParseOptions(options);

  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }
}

export function prepareTypeScriptParseOptions(
  options: TypeScriptParseOptions = {},
): PreparedOptions<ResolvedTypeScriptParseOptions> {
  const resolved = resolveTypeScriptParseOptions(options);

  return {
    resolved,
    warnings: [],
    errors: validateTypeScriptParseOptions(resolved),
  };
}

export function createTypeScriptParser(
  parseWithOptions: (
    input: string,
    options: ResolvedTypeScriptParseOptions,
  ) => TypeScriptInferenceResult,
  options: TypeScriptParseOptions = {},
): SchemaParser<string, TypeScriptParseOptions, TypeScriptInferenceResult> {
  return {
    format: "typescript",
    parse(input, runtimeOptions) {
      return parseWithOptions(
        input,
        resolveTypeScriptParseOptions({
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

export function configureTypeScriptParser(
  parseWithOptions: (
    input: string,
    options: ResolvedTypeScriptParseOptions,
  ) => TypeScriptInferenceResult,
  options: TypeScriptParseOptions = {},
): ConfiguredParser<
  SchemaParser<string, TypeScriptParseOptions, TypeScriptInferenceResult>,
  ResolvedTypeScriptParseOptions
> {
  const prepared = prepareTypeScriptParseOptions(options);

  if (prepared.errors.length > 0) {
    throw new Error(
      `Invalid TypeScript parser options: ${prepared.errors.join("; ")}`,
    );
  }

  return {
    prepared,
    parser: createTypeScriptParser(parseWithOptions, options),
  };
}
