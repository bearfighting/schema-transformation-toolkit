import type {
  ConfiguredGenerator,
  GenerateOptions,
  PreparedOptions,
  SchemaGenerator,
} from "@aio/core";
import type { JsonSchemaGenerateResult } from "./failure.js";

export type JsonSchemaDraft = "2020-12";
export type JsonSchemaUnknownStrategy = "true";
export type JsonSchemaObjectAdditionalPropertiesMode = "omit" | "false";
export type JsonSchemaUnionComposition = "oneOf" | "anyOf";
export type JsonSchemaOutput = Record<string, unknown> | boolean;

export interface JsonSchemaGeneratorOptions extends GenerateOptions {
  includeSchemaUri?: boolean;
  includeId?: boolean;
  unknownStrategy?: JsonSchemaUnknownStrategy;
  objectAdditionalPropertiesMode?: JsonSchemaObjectAdditionalPropertiesMode;
  unionComposition?: JsonSchemaUnionComposition;
}

export interface ResolvedJsonSchemaGeneratorOptions {
  draft: JsonSchemaDraft;
  includeSchemaUri: boolean;
  includeId: boolean;
  unknownStrategy: JsonSchemaUnknownStrategy;
  objectAdditionalPropertiesMode: JsonSchemaObjectAdditionalPropertiesMode;
  unionComposition: JsonSchemaUnionComposition;
}

export const DEFAULT_JSON_SCHEMA_GENERATOR_OPTIONS: ResolvedJsonSchemaGeneratorOptions =
  {
    draft: "2020-12",
    includeSchemaUri: true,
    includeId: false,
    unknownStrategy: "true",
    objectAdditionalPropertiesMode: "omit",
    unionComposition: "oneOf",
  };

export function resolveJsonSchemaGeneratorOptions(
  options: JsonSchemaGeneratorOptions = {},
): ResolvedJsonSchemaGeneratorOptions {
  return {
    draft: DEFAULT_JSON_SCHEMA_GENERATOR_OPTIONS.draft,
    includeSchemaUri:
      options.includeSchemaUri ??
      DEFAULT_JSON_SCHEMA_GENERATOR_OPTIONS.includeSchemaUri,
    includeId:
      options.includeId ?? DEFAULT_JSON_SCHEMA_GENERATOR_OPTIONS.includeId,
    unknownStrategy:
      options.unknownStrategy ??
      DEFAULT_JSON_SCHEMA_GENERATOR_OPTIONS.unknownStrategy,
    objectAdditionalPropertiesMode:
      options.objectAdditionalPropertiesMode ??
      DEFAULT_JSON_SCHEMA_GENERATOR_OPTIONS.objectAdditionalPropertiesMode,
    unionComposition:
      options.unionComposition ??
      DEFAULT_JSON_SCHEMA_GENERATOR_OPTIONS.unionComposition,
  };
}

export function prepareJsonSchemaGeneratorOptions(
  options: JsonSchemaGeneratorOptions = {},
): PreparedOptions<ResolvedJsonSchemaGeneratorOptions> {
  const resolved = resolveJsonSchemaGeneratorOptions(options);

  return {
    resolved,
    warnings: [],
    errors: validateJsonSchemaGeneratorOptions(resolved),
  };
}

export function validateJsonSchemaGeneratorOptions(
  options: ResolvedJsonSchemaGeneratorOptions,
): string[] {
  const errors: string[] = [];

  if (options.draft !== "2020-12") {
    errors.push('draft must be "2020-12".');
  }

  if (options.unknownStrategy !== "true") {
    errors.push('unknownStrategy must be "true".');
  }

  if (
    options.objectAdditionalPropertiesMode !== "omit" &&
    options.objectAdditionalPropertiesMode !== "false"
  ) {
    errors.push('objectAdditionalPropertiesMode must be "omit" or "false".');
  }

  if (
    options.unionComposition !== "oneOf" &&
    options.unionComposition !== "anyOf"
  ) {
    errors.push('unionComposition must be "oneOf" or "anyOf".');
  }

  return errors;
}

export type ConfiguredJsonSchemaGenerator = ConfiguredGenerator<
  SchemaGenerator<
    JsonSchemaOutput,
    JsonSchemaGeneratorOptions,
    JsonSchemaGenerateResult
  >,
  ResolvedJsonSchemaGeneratorOptions
>;
