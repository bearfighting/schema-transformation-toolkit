export {
  DEFAULT_TYPESCRIPT_GENERATOR_OPTIONS,
  configureTypeScriptGenerator,
  createTypeScriptGenerator,
  generateTypeScript,
  preparedTypeScriptGeneratorOptions,
  tryGenerateTypeScript,
  typeScriptGenerator,
} from "./api.js";
export {
  collectTypeScriptCapabilityRequirements,
  collectTypeScriptTargetLossHotspots,
} from "./analysis.js";
export { typeScriptGeneratorCapabilities } from "./capabilities.js";
export type {
  TypeScriptCapabilityRequirement,
  TypeScriptLossHotspot,
  TypeScriptLossHotspotCode,
  TypeScriptSchemaFeature,
} from "./analysis.js";
export {
  prepareTypeScriptGeneratorOptions,
  resolveTypeScriptGeneratorOptions,
  validateTypeScriptGeneratorOptions,
} from "./options.js";
export type {
  ConfiguredTypeScriptGenerator,
  ResolvedTypeScriptGeneratorOptions,
  TypeScriptArrayStyle,
  TypeScriptGeneratorOptions,
  TypeScriptRootObjectMode,
} from "./options.js";
export type {
  TypeScriptGenerateFailureResult,
  TypeScriptGenerateResult,
  TypeScriptGeneratorFailureCode,
} from "./failure.js";
