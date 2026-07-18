export {
  TypeScriptInferenceError,
  isTypeScriptInferenceError,
} from "./errors.js";
export { typeScriptParserCapabilities } from "./capabilities.js";
export {
  inferTypeScriptDocument,
  inferTypeScriptDocumentWithOptions,
  preparedTypeScriptParserOptions,
  tryInferTypeScriptDocument,
  tryInferTypeScriptDocumentWithOptions,
  typeScriptParser,
  type TypeScriptInferenceFailureResult,
  type TypeScriptInferenceResult,
  type TypeScriptInferenceSuccessResult,
} from "./api.js";
export {
  preprocessTypeScriptSource,
  type TypeScriptPreprocessFailureResult,
  type TypeScriptPreprocessResult,
  type TypeScriptPreprocessSuccessResult,
} from "./preprocess.js";
export { createTypeScriptSourceFile } from "./syntax.js";
export {
  DEFAULT_TYPESCRIPT_PARSE_OPTIONS,
  assertSupportedTypeScriptParseOptions,
  configureTypeScriptParser,
  createTypeScriptParser,
  prepareTypeScriptParseOptions,
  resolveTypeScriptParseOptions,
  validateTypeScriptParseOptions,
  type ResolvedTypeScriptParseOptions,
  type TypeScriptDiagnosticsOptions,
  type TypeScriptParseOptions,
  type TypeScriptParseStrictness,
} from "./options.js";
