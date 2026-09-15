export { csharpParserCapabilities } from "./capabilities.js";
export { csharpParserDescriptor } from "./descriptor.js";
export { parseCSharp, tryParseCSharp, csharpParser } from "./api.js";
export type { CSharpParseResult, CSharpParseSuccessResult } from "./api.js";
export { CSharpSemanticError, CSharpSyntaxError } from "./failure.js";
export type {
  CSharpParseFailureResult,
  CSharpParserFailureCode,
  CSharpPosition,
} from "./failure.js";
export { csharpParserOptionCatalog } from "./option-metadata.js";
export {
  DEFAULT_CSHARP_PARSE_OPTIONS,
  prepareCSharpParseOptions,
  resolveCSharpParseOptions,
  validateCSharpParseOptions,
} from "./options.js";
export type {
  CSharpParserOptions,
  ResolvedCSharpParserOptions,
} from "./options.js";
