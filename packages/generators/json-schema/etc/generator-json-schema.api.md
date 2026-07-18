# API Snapshot: @aio/generator-json-schema

Entry: packages/generators/json-schema/src/index.ts

## packages/generators/json-schema/src/api.d.ts

```ts
import type { SchemaDocument, SchemaGenerator } from "@aio/core";
import type { JsonSchemaGenerateResult } from "./failure.js";
import {
  type ConfiguredJsonSchemaGenerator,
  DEFAULT_JSON_SCHEMA_GENERATOR_OPTIONS,
  type JsonSchemaGeneratorOptions,
  type JsonSchemaOutput,
  type ResolvedJsonSchemaGeneratorOptions,
} from "./options.js";
/** Renders a schema document to JSON Schema output or throws on generation failure. */
export declare function generateJsonSchema(
  doc: SchemaDocument,
  options?: JsonSchemaGeneratorOptions,
): JsonSchemaOutput;
/** Renders a schema document to JSON Schema output and returns a structured success or failure result. */
export declare function tryGenerateJsonSchema(
  doc: SchemaDocument,
  options?: JsonSchemaGeneratorOptions,
): JsonSchemaGenerateResult;
/** Creates a JSON Schema generator instance with fixed base options. */
export declare function createJsonSchemaGenerator(
  options?: JsonSchemaGeneratorOptions,
): SchemaGenerator<
  JsonSchemaOutput,
  JsonSchemaGeneratorOptions,
  JsonSchemaGenerateResult
>;
/** Prepares options and returns both the configured JSON Schema generator and its prepared option state. */
export declare function configureJsonSchemaGenerator(
  options?: JsonSchemaGeneratorOptions,
): ConfiguredJsonSchemaGenerator;
/** Shared default JSON Schema generator instance using the default options. */
export declare const jsonSchemaGenerator: SchemaGenerator<
  JsonSchemaOutput,
  JsonSchemaGeneratorOptions,
  JsonSchemaGenerateResult
>;
/** Prepared default option state for the shared JSON Schema generator instance. */
export declare const preparedJsonSchemaGeneratorOptions: import("@aio/core").PreparedOptions<ResolvedJsonSchemaGeneratorOptions>;
export { DEFAULT_JSON_SCHEMA_GENERATOR_OPTIONS };
```

## packages/generators/json-schema/src/capabilities.d.ts

```ts
import type { GeneratorCapabilities } from "@aio/core";
export declare const jsonSchemaGeneratorCapabilities: GeneratorCapabilities;
```

## packages/generators/json-schema/src/failure.d.ts

```ts
import type { GenerateFailureResult, GenerateSuccessResult } from "@aio/core";
import type { JsonSchemaOutput } from "./options.js";
export type JsonSchemaGeneratorFailureCode =
  | "invalid-json-schema-reference"
  | "invalid-record-key"
  | "unsupported-node-kind";
export type JsonSchemaGenerateFailureResult =
  GenerateFailureResult<JsonSchemaGeneratorFailureCode>;
export type JsonSchemaGenerateResult =
  GenerateSuccessResult<JsonSchemaOutput> | JsonSchemaGenerateFailureResult;
```

## packages/generators/json-schema/src/index.d.ts

```ts
export {
  DEFAULT_JSON_SCHEMA_GENERATOR_OPTIONS,
  configureJsonSchemaGenerator,
  createJsonSchemaGenerator,
  generateJsonSchema,
  jsonSchemaGenerator,
  preparedJsonSchemaGeneratorOptions,
  tryGenerateJsonSchema,
} from "./api.js";
export { jsonSchemaGeneratorCapabilities } from "./capabilities.js";
export {
  prepareJsonSchemaGeneratorOptions,
  resolveJsonSchemaGeneratorOptions,
  validateJsonSchemaGeneratorOptions,
} from "./options.js";
export type {
  ConfiguredJsonSchemaGenerator,
  JsonSchemaDraft,
  JsonSchemaGeneratorOptions,
  JsonSchemaObjectAdditionalPropertiesMode,
  JsonSchemaOutput,
  JsonSchemaUnionComposition,
  JsonSchemaUnknownStrategy,
  ResolvedJsonSchemaGeneratorOptions,
} from "./options.js";
export type {
  JsonSchemaGenerateFailureResult,
  JsonSchemaGenerateResult,
  JsonSchemaGeneratorFailureCode,
} from "./failure.js";
```

## packages/generators/json-schema/src/options.d.ts

```ts
import type {
  ConstraintDocument,
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
  constraints?: ConstraintDocument;
}
export interface ResolvedJsonSchemaGeneratorOptions {
  draft: JsonSchemaDraft;
  includeSchemaUri: boolean;
  includeId: boolean;
  unknownStrategy: JsonSchemaUnknownStrategy;
  objectAdditionalPropertiesMode: JsonSchemaObjectAdditionalPropertiesMode;
  unionComposition: JsonSchemaUnionComposition;
  constraints?: ConstraintDocument;
}
export declare const DEFAULT_JSON_SCHEMA_GENERATOR_OPTIONS: ResolvedJsonSchemaGeneratorOptions;
export declare function resolveJsonSchemaGeneratorOptions(
  options?: JsonSchemaGeneratorOptions,
): ResolvedJsonSchemaGeneratorOptions;
export declare function prepareJsonSchemaGeneratorOptions(
  options?: JsonSchemaGeneratorOptions,
): PreparedOptions<ResolvedJsonSchemaGeneratorOptions>;
export declare function validateJsonSchemaGeneratorOptions(
  options: ResolvedJsonSchemaGeneratorOptions,
): string[];
export type ConfiguredJsonSchemaGenerator = ConfiguredGenerator<
  SchemaGenerator<
    JsonSchemaOutput,
    JsonSchemaGeneratorOptions,
    JsonSchemaGenerateResult
  >,
  ResolvedJsonSchemaGeneratorOptions
>;
```
