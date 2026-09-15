export { csharpGeneratorCapabilities } from "./capabilities.js";
export { csharpGeneratorDescriptor } from "./descriptor.js";
export { generateCSharp, tryGenerateCSharp } from "./api.js";
export {
  DEFAULT_CSHARP_GENERATOR_OPTIONS,
  assertSupportedCSharpGeneratorOptions,
  prepareCSharpGeneratorOptions,
  resolveCSharpGeneratorOptions,
  validateCSharpGeneratorOptions,
} from "./options.js";
export type {
  CSharpGeneratorOptions,
  ResolvedCSharpGeneratorOptions,
} from "./options.js";
export {
  CSharpGenerationError,
  type CSharpGenerateFailureResult,
  type CSharpGenerateResult,
  type CSharpGeneratorFailureCode,
} from "./failure.js";
