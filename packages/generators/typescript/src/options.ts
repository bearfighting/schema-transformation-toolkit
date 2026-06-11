import type {
  ConfiguredGenerator,
  GenerateOptions,
  PreparedOptions,
  SchemaGenerator,
} from "@aio/core";
import type { NamingStrategy } from "@aio/core";
import { createTypeScriptNamingStrategy } from "./naming.js";
import type { TypeScriptGenerateResult } from "./failure.js";

export type TypeScriptRootObjectMode = "interface" | "type";
export type TypeScriptArrayStyle = "smart" | "compact" | "generic";

export interface TypeScriptGeneratorOptions extends GenerateOptions {
  namingStrategy?: NamingStrategy;
  rootObjectMode?: TypeScriptRootObjectMode;
  arrayStyle?: TypeScriptArrayStyle;
}

export interface ResolvedTypeScriptGeneratorOptions {
  namingStrategy: NamingStrategy;
  rootObjectMode: TypeScriptRootObjectMode;
  arrayStyle: TypeScriptArrayStyle;
}

export const DEFAULT_TYPESCRIPT_GENERATOR_OPTIONS: ResolvedTypeScriptGeneratorOptions =
  {
    namingStrategy: createTypeScriptNamingStrategy(),
    rootObjectMode: "interface",
    arrayStyle: "smart",
  };

export function resolveTypeScriptGeneratorOptions(
  options: TypeScriptGeneratorOptions = {},
): ResolvedTypeScriptGeneratorOptions {
  return {
    namingStrategy:
      options.namingStrategy ??
      DEFAULT_TYPESCRIPT_GENERATOR_OPTIONS.namingStrategy,
    rootObjectMode:
      options.rootObjectMode ??
      DEFAULT_TYPESCRIPT_GENERATOR_OPTIONS.rootObjectMode,
    arrayStyle:
      options.arrayStyle ?? DEFAULT_TYPESCRIPT_GENERATOR_OPTIONS.arrayStyle,
  };
}

export function prepareTypeScriptGeneratorOptions(
  options: TypeScriptGeneratorOptions = {},
): PreparedOptions<ResolvedTypeScriptGeneratorOptions> {
  const resolved = resolveTypeScriptGeneratorOptions(options);

  return {
    resolved,
    warnings: [],
    errors: validateTypeScriptGeneratorOptions(resolved),
  };
}

export function validateTypeScriptGeneratorOptions(
  options: ResolvedTypeScriptGeneratorOptions,
): string[] {
  const errors: string[] = [];

  if (
    typeof options.namingStrategy.renderTypeName !== "function" ||
    typeof options.namingStrategy.renderFieldName !== "function"
  ) {
    errors.push(
      "namingStrategy must provide renderTypeName() and renderFieldName().",
    );
  }

  if (options.rootObjectMode !== "interface" && options.rootObjectMode !== "type") {
    errors.push('rootObjectMode must be either "interface" or "type".');
  }

  if (
    options.arrayStyle !== "smart" &&
    options.arrayStyle !== "compact" &&
    options.arrayStyle !== "generic"
  ) {
    errors.push('arrayStyle must be "smart", "compact", or "generic".');
  }

  return errors;
}

export type ConfiguredTypeScriptGenerator = ConfiguredGenerator<
  SchemaGenerator<string, TypeScriptGeneratorOptions, TypeScriptGenerateResult>,
  ResolvedTypeScriptGeneratorOptions
>;
