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
} from "./parse.js";
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
