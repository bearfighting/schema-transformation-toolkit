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
