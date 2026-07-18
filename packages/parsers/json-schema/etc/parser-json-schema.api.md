# API Snapshot: @aio/parser-json-schema

Entry: packages/parsers/json-schema/src/index.ts

## packages/parsers/json-schema/src/api.d.ts

```ts
import type {
  ConstraintDocument,
  ParseFailureResult,
  SchemaDiagnostic,
  SchemaDocument,
  SchemaSemanticNote,
} from "@aio/core";
import {
  type JsonSchemaParseOptions,
  type ResolvedJsonSchemaParseOptions,
} from "./options.js";
export interface JsonSchemaInferenceSuccessResult {
  ok: true;
  document: SchemaDocument;
  constraints?: ConstraintDocument;
  diagnostics?: SchemaDiagnostic[];
  semanticNotes?: SchemaSemanticNote[];
}
export type JsonSchemaInferenceFailureResult = ParseFailureResult<
  | "invalid-json-schema-json"
  | "unsupported-json-schema-draft"
  | "unsupported-json-schema-ref"
  | "unsupported-json-schema-keyword"
  | "unsupported-json-schema-boolean-false"
  | "unsupported-json-schema-closed-object"
  | "unsupported-json-schema-mixed-object-shape"
  | "unsupported-json-schema-type-array"
  | "invalid-json-schema-shape"
  | "unsupported-json-schema-parser-v0"
>;
export type JsonSchemaInferenceResult =
  JsonSchemaInferenceSuccessResult | JsonSchemaInferenceFailureResult;
/** Parses JSON Schema source and returns the inferred schema document or throws on failure. */
export declare function inferJsonSchemaDocument(
  input: string,
  name?: string,
): SchemaDocument;
/** Parses JSON Schema source with explicit parser options and returns the inferred schema document or throws on failure. */
export declare function inferJsonSchemaDocumentWithOptions(
  input: string,
  options?: JsonSchemaParseOptions,
): SchemaDocument;
/** Parses JSON Schema source and returns a structured success or failure result. */
export declare function tryInferJsonSchemaDocument(
  input: string,
  name?: string,
): JsonSchemaInferenceResult;
/** Parses JSON Schema source with explicit parser options and returns a structured success or failure result. */
export declare function tryInferJsonSchemaDocumentWithOptions(
  input: string,
  options?: JsonSchemaParseOptions,
): JsonSchemaInferenceResult;
/** Shared default JSON Schema parser instance using the default v0 options. */
export declare const jsonSchemaParser: import("@aio/core").SchemaParser<
  string,
  JsonSchemaParseOptions,
  JsonSchemaInferenceResult
>;
/** Prepared default option state for the shared JSON Schema parser instance. */
export declare const preparedJsonSchemaParserOptions: import("@aio/core").PreparedOptions<ResolvedJsonSchemaParseOptions>;
```

## packages/parsers/json-schema/src/capabilities.d.ts

```ts
import type { ParserCapabilities } from "@aio/core";
export declare const jsonSchemaParserCapabilities: ParserCapabilities;
```

## packages/parsers/json-schema/src/errors.d.ts

```ts
import type { SchemaDiagnostic } from "@aio/core";
export type JsonSchemaInferenceErrorCode =
  | "invalid-json-schema-json"
  | "unsupported-json-schema-draft"
  | "unsupported-json-schema-ref"
  | "unsupported-json-schema-keyword"
  | "unsupported-json-schema-boolean-false"
  | "unsupported-json-schema-closed-object"
  | "unsupported-json-schema-mixed-object-shape"
  | "unsupported-json-schema-type-array"
  | "invalid-json-schema-shape";
export declare class JsonSchemaInferenceError extends Error {
  readonly code: JsonSchemaInferenceErrorCode;
  readonly diagnostics: SchemaDiagnostic[] | undefined;
  constructor(
    code: JsonSchemaInferenceErrorCode,
    message: string,
    diagnostics?: SchemaDiagnostic[],
  );
}
export declare function isJsonSchemaInferenceError(
  error: unknown,
): error is JsonSchemaInferenceError;
export declare function throwJsonSchemaInferenceError(
  code: JsonSchemaInferenceErrorCode,
  message: string,
  diagnostics: SchemaDiagnostic[],
): never;
```

## packages/parsers/json-schema/src/index.d.ts

```ts
export {
  JsonSchemaInferenceError,
  isJsonSchemaInferenceError,
} from "./errors.js";
export { jsonSchemaParserCapabilities } from "./capabilities.js";
export {
  inferJsonSchemaDocument,
  inferJsonSchemaDocumentWithOptions,
  preparedJsonSchemaParserOptions,
  tryInferJsonSchemaDocument,
  tryInferJsonSchemaDocumentWithOptions,
  jsonSchemaParser,
  type JsonSchemaInferenceFailureResult,
  type JsonSchemaInferenceResult,
  type JsonSchemaInferenceSuccessResult,
} from "./api.js";
export {
  DEFAULT_JSON_SCHEMA_PARSE_OPTIONS,
  assertSupportedJsonSchemaParseOptions,
  configureJsonSchemaParser,
  createJsonSchemaParser,
  prepareJsonSchemaParseOptions,
  resolveJsonSchemaParseOptions,
  validateJsonSchemaParseOptions,
  type JsonSchemaDiagnosticsOptions,
  type JsonSchemaParseOptions,
  type JsonSchemaParseStrictness,
  type ResolvedJsonSchemaParseOptions,
} from "./options.js";
```

## packages/parsers/json-schema/src/options.d.ts

```ts
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
export declare const DEFAULT_JSON_SCHEMA_PARSE_OPTIONS: ResolvedJsonSchemaParseOptions;
export declare function resolveJsonSchemaParseOptions(
  options?: JsonSchemaParseOptions,
): ResolvedJsonSchemaParseOptions;
export declare function validateJsonSchemaParseOptions(
  options: ResolvedJsonSchemaParseOptions,
): string[];
export declare function assertSupportedJsonSchemaParseOptions(
  options: ResolvedJsonSchemaParseOptions,
): void;
export declare function prepareJsonSchemaParseOptions(
  options?: JsonSchemaParseOptions,
): PreparedOptions<ResolvedJsonSchemaParseOptions>;
export declare function createJsonSchemaParser(
  parseWithOptions: (
    input: string,
    options: ResolvedJsonSchemaParseOptions,
  ) => JsonSchemaInferenceResult,
  options?: JsonSchemaParseOptions,
): SchemaParser<string, JsonSchemaParseOptions, JsonSchemaInferenceResult>;
export declare function configureJsonSchemaParser(
  parseWithOptions: (
    input: string,
    options: ResolvedJsonSchemaParseOptions,
  ) => JsonSchemaInferenceResult,
  options?: JsonSchemaParseOptions,
): ConfiguredParser<
  SchemaParser<string, JsonSchemaParseOptions, JsonSchemaInferenceResult>,
  ResolvedJsonSchemaParseOptions
>;
```
