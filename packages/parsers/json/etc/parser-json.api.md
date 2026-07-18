# API Snapshot: @aio/parser-json

Entry: packages/parsers/json/src/index.ts

## packages/parsers/json/src/api.d.ts

```ts
export { decodeJsonText as parseJsonValue } from "./decode.js";
export {
  inferJsonDocumentFromValueDocument,
  inferJsonDocumentFromValueDocumentWithOptions,
  parseJsonValueDocument,
  parseJsonValueDocumentWithOptions,
  tryInferJsonDocumentFromValueDocument,
  tryInferJsonDocumentFromValueDocumentWithOptions,
  tryParseJsonValueDocument,
  tryParseJsonValueDocumentWithOptions,
  type JsonValueDocumentFailureResult,
  type JsonValueDocumentResult,
  type JsonValueDocumentSuccessResult,
} from "./value.js";
export {
  inferJsonDocument,
  inferJsonDocumentWithOptions,
  jsonParser,
  preparedJsonParserOptions,
  tryInferJsonDocument,
  tryInferJsonDocumentWithOptions,
  type JsonInferenceFailureResult,
  type JsonInferenceResult,
  type JsonInferenceSuccessResult,
} from "./schema/parse.js";
```

## packages/parsers/json/src/capabilities.d.ts

```ts
import type { ParserCapabilities } from "@aio/core";
export declare const jsonParserCapabilities: ParserCapabilities;
```

## packages/parsers/json/src/decode.d.ts

```ts
import type { JsonValue } from "./types.js";
export declare function decodeJsonText(input: string): JsonValue;
```

## packages/parsers/json/src/errors.d.ts

```ts
import type { SchemaDiagnostic } from "@aio/core";
export type JsonInferenceErrorCode = "invalid-json" | "unsupported-mixed-types";
export declare class JsonInferenceError extends Error {
  readonly code: JsonInferenceErrorCode;
  readonly diagnostics: SchemaDiagnostic[] | undefined;
  constructor(
    code: JsonInferenceErrorCode,
    message: string,
    diagnostics?: SchemaDiagnostic[],
  );
}
export declare function isJsonInferenceError(
  error: unknown,
): error is JsonInferenceError;
```

## packages/parsers/json/src/index.d.ts

```ts
export { JsonInferenceError, isJsonInferenceError } from "./errors.js";
export { jsonParserCapabilities } from "./capabilities.js";
export { decodeJsonText } from "./decode.js";
export { inferJsonType } from "./infer.js";
export {
  inferJsonDocument,
  inferJsonDocumentFromValueDocument,
  inferJsonDocumentFromValueDocumentWithOptions,
  inferJsonDocumentWithOptions,
  jsonParser,
  parseJsonValue,
  parseJsonValueDocument,
  parseJsonValueDocumentWithOptions,
  preparedJsonParserOptions,
  tryInferJsonDocumentFromValueDocument,
  tryInferJsonDocumentFromValueDocumentWithOptions,
  tryInferJsonDocument,
  tryInferJsonDocumentWithOptions,
  tryParseJsonValueDocument,
  tryParseJsonValueDocumentWithOptions,
  type JsonInferenceFailureResult,
  type JsonInferenceResult,
  type JsonInferenceSuccessResult,
  type JsonValueDocumentFailureResult,
  type JsonValueDocumentResult,
  type JsonValueDocumentSuccessResult,
} from "./api.js";
export { inferSchemaNodeFromJsonValue } from "./schema/index.js";
export {
  DEFAULT_JSON_DECODE_OPTIONS,
  DEFAULT_JSON_PARSE_OPTIONS,
  assertSupportedJsonParseOptions,
  configureJsonParser,
  createJsonParser,
  prepareJsonParseOptions,
  resolveJsonDecodeOptions,
  resolveJsonParseOptions,
  validateJsonDecodeOptions,
  validateJsonParseOptions,
  type JsonDiagnosticsOptions,
  type JsonDecodeOptions,
  type JsonEmptyArrayMode,
  type JsonInferenceOptions,
  type JsonMixedTypeMode,
  type JsonNullHandling,
  type JsonNumericMode,
  type JsonParseOptions,
  type JsonParseStrictness,
  type ResolvedJsonDecodeOptions,
  type ResolvedJsonParseOptions,
} from "./options.js";
export type {
  JsonArray,
  JsonObject,
  JsonPrimitive,
  JsonValue,
  ScalarJsonKind,
} from "./types.js";
```

## packages/parsers/json/src/infer.d.ts

```ts
import { type ResolvedJsonParseOptions } from "./options.js";
import { type SchemaDiagnostic, type SchemaNode } from "@aio/core";
import type { JsonValue } from "./types.js";
export declare function inferJsonType(
  value: JsonValue,
  options?: ResolvedJsonParseOptions,
): SchemaNode;
export declare function inferSchemaNodeFromJsonValue(
  value: JsonValue,
  options?: ResolvedJsonParseOptions,
  diagnostics?: SchemaDiagnostic[],
  path?: string[],
): SchemaNode;
```

## packages/parsers/json/src/options.d.ts

```ts
export {
  DEFAULT_JSON_DECODE_OPTIONS,
  DEFAULT_JSON_PARSE_OPTIONS,
  assertSupportedJsonParseOptions,
  configureJsonParser,
  createJsonParser,
  prepareJsonParseOptions,
  resolveJsonDecodeOptions,
  resolveJsonParseOptions,
  validateJsonDecodeOptions,
  validateJsonParseOptions,
} from "./schema/options.js";
export type {
  JsonDecodeOptions,
  JsonDiagnosticsOptions,
  JsonEmptyArrayMode,
  JsonMixedTypeMode,
  JsonNullHandling,
  JsonNumericMode,
  JsonParseStrictness,
  JsonRecordInferenceMode,
  JsonInferenceOptions,
  JsonParseOptions,
  JsonTupleInferenceMode,
  ResolvedJsonDecodeOptions,
  ResolvedJsonParseOptions,
} from "./schema/options.js";
```

## packages/parsers/json/src/schema/index.d.ts

```ts
export { inferSchemaNodeFromJsonValue } from "./infer.js";
export {
  inferJsonDocument,
  inferJsonDocumentWithOptions,
  jsonParser,
  preparedJsonParserOptions,
  tryInferJsonDocument,
  tryInferJsonDocumentWithOptions,
  type JsonInferenceFailureResult,
  type JsonInferenceResult,
  type JsonInferenceSuccessResult,
} from "./parse.js";
export {
  DEFAULT_JSON_DECODE_OPTIONS,
  DEFAULT_JSON_PARSE_OPTIONS,
  assertSupportedJsonParseOptions,
  configureJsonParser,
  createJsonParser,
  prepareJsonParseOptions,
  resolveJsonDecodeOptions,
  resolveJsonParseOptions,
  validateJsonDecodeOptions,
  validateJsonParseOptions,
  type JsonDecodeOptions,
  type JsonDiagnosticsOptions,
  type JsonEmptyArrayMode,
  type JsonInferenceOptions,
  type JsonMixedTypeMode,
  type JsonNullHandling,
  type JsonNumericMode,
  type JsonParseStrictness,
  type JsonParseOptions,
  type ResolvedJsonDecodeOptions,
  type ResolvedJsonParseOptions,
} from "./options.js";
```

## packages/parsers/json/src/schema/infer.d.ts

```ts
export { inferSchemaNodeFromJsonValue } from "../infer.js";
```

## packages/parsers/json/src/schema/options.d.ts

```ts
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
export declare const DEFAULT_JSON_DECODE_OPTIONS: ResolvedJsonDecodeOptions;
export declare const DEFAULT_JSON_PARSE_OPTIONS: ResolvedJsonParseOptions;
export declare function resolveJsonDecodeOptions(
  options?: JsonDecodeOptions,
): ResolvedJsonDecodeOptions;
export declare function resolveJsonParseOptions(
  options?: JsonParseOptions,
): ResolvedJsonParseOptions;
export declare function validateJsonDecodeOptions(
  options: ResolvedJsonDecodeOptions,
): string[];
export declare function validateJsonParseOptions(
  options: ResolvedJsonParseOptions,
): string[];
export declare function assertSupportedJsonParseOptions(
  options: ResolvedJsonParseOptions,
): void;
export declare function prepareJsonParseOptions(
  options?: JsonParseOptions,
): PreparedOptions<ResolvedJsonParseOptions>;
export declare function createJsonParser(
  parseWithOptions: (
    input: string,
    options: ResolvedJsonParseOptions,
  ) => JsonInferenceResult,
  options?: JsonParseOptions,
): SchemaParser<string, JsonParseOptions, JsonInferenceResult>;
export declare function configureJsonParser(
  parseWithOptions: (
    input: string,
    options: ResolvedJsonParseOptions,
  ) => JsonInferenceResult,
  options?: JsonParseOptions,
): ConfiguredParser<
  SchemaParser<string, JsonParseOptions, JsonInferenceResult>,
  ResolvedJsonParseOptions
>;
```

## packages/parsers/json/src/schema/parse.d.ts

```ts
import type {
  ParseFailureResult,
  SchemaDiagnostic,
  SchemaDocument,
} from "@aio/core";
import {
  type JsonParseOptions,
  type ResolvedJsonParseOptions,
} from "./options.js";
export interface JsonInferenceSuccessResult {
  ok: true;
  document: SchemaDocument;
  diagnostics?: SchemaDiagnostic[];
}
export type JsonInferenceFailureResult = ParseFailureResult<
  "invalid-json" | "unsupported-mixed-types"
>;
export type JsonInferenceResult =
  JsonInferenceSuccessResult | JsonInferenceFailureResult;
/** Parses JSON text and returns the inferred schema document or throws on failure. */
export declare function inferJsonDocument(
  input: string,
  name?: string,
): SchemaDocument;
/** Parses JSON text with explicit parser options and returns the inferred schema document or throws on failure. */
export declare function inferJsonDocumentWithOptions(
  input: string,
  options?: JsonParseOptions,
): SchemaDocument;
/** Parses JSON text and returns a structured success or failure result. */
export declare function tryInferJsonDocument(
  input: string,
  name?: string,
): JsonInferenceResult;
/** Parses JSON text with explicit parser options and returns a structured success or failure result. */
export declare function tryInferJsonDocumentWithOptions(
  input: string,
  options?: JsonParseOptions,
): JsonInferenceResult;
/** Shared default JSON parser instance using the default v0 options. */
export declare const jsonParser: import("@aio/core").SchemaParser<
  string,
  JsonParseOptions,
  JsonInferenceResult
>;
/** Prepared default option state for the shared JSON parser instance. */
export declare const preparedJsonParserOptions: import("@aio/core").PreparedOptions<ResolvedJsonParseOptions>;
```

## packages/parsers/json/src/types.d.ts

```ts
export type JsonPrimitive = string | number | boolean | null;
export type JsonArray = JsonValue[];
export interface JsonObject {
  [key: string]: JsonValue;
}
export type JsonValue = JsonPrimitive | JsonArray | JsonObject;
export type ScalarJsonKind = "string" | "integer" | "number" | "boolean";
```

## packages/parsers/json/src/value.d.ts

```ts
import type {
  ParseFailureResult,
  SchemaDiagnostic,
  SchemaDocument,
  ValueDocument,
} from "@aio/core";
import { type JsonParseOptions } from "./schema/options.js";
export interface JsonValueDocumentSuccessResult {
  ok: true;
  document: ValueDocument;
}
export type JsonValueDocumentFailureResult = ParseFailureResult<"invalid-json">;
export type JsonValueDocumentResult =
  JsonValueDocumentSuccessResult | JsonValueDocumentFailureResult;
export declare function parseJsonValueDocument(
  input: string,
  name?: string,
): ValueDocument;
export declare function parseJsonValueDocumentWithOptions(
  input: string,
  options?: JsonParseOptions,
): ValueDocument;
export declare function tryParseJsonValueDocument(
  input: string,
  name?: string,
): JsonValueDocumentResult;
export declare function tryParseJsonValueDocumentWithOptions(
  input: string,
  options?: JsonParseOptions,
): JsonValueDocumentResult;
export declare function inferJsonDocumentFromValueDocument(
  document: ValueDocument,
): SchemaDocument;
export declare function inferJsonDocumentFromValueDocumentWithOptions(
  document: ValueDocument,
  options?: JsonParseOptions,
): SchemaDocument;
export declare function tryInferJsonDocumentFromValueDocument(
  document: ValueDocument,
):
  | {
      ok: true;
      document: SchemaDocument;
      diagnostics?: SchemaDiagnostic[];
    }
  | ParseFailureResult<"unsupported-mixed-types">;
export declare function tryInferJsonDocumentFromValueDocumentWithOptions(
  document: ValueDocument,
  options?: JsonParseOptions,
):
  | {
      ok: true;
      document: SchemaDocument;
      diagnostics?: SchemaDiagnostic[];
    }
  | ParseFailureResult<"unsupported-mixed-types">;
```
