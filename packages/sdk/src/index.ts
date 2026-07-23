export {
  convert,
  describeConversionRouteCapabilities,
  listConversionRoutes,
  planConversion,
} from "./convert.js";
export {
  conversionArtifactsSchema,
  conversionCapabilityRequirementSchema,
  conversionEntrySelectionSchema,
  conversionLossHotspotSchema,
  conversionPolicyDecisionSchema,
  conversionReportSchema,
  conversionRouteSchema,
  conversionSemanticCaveatSchema,
  convertFailureResultSchema,
  convertSuccessResultSchema,
  publicConvertResultSchema,
  schemaDiagnosticSchema,
  semanticLossSchema,
} from "./public-contract.js";
export { inspectTypeScriptImplicitEntry } from "./inspect.js";
export { collectUserFacingDiagnostics } from "./ui-diagnostics.js";
export { describeFormatSupport, listFormatSupports } from "./support-matrix.js";
export type {
  UserFacingDiagnostic,
  UserFacingSourcePosition,
  UserFacingSourceRange,
} from "./ui-diagnostics.js";
export type {
  TypeScriptImplicitEntryAmbiguityReason,
  TypeScriptImplicitEntryAnalysis,
} from "./inspect.js";
export type {
  ConversionArtifacts,
  ConvertFailureResult,
  ConvertOptions,
  ConvertResult,
  ConvertSuccessResult,
  ConversionSourceFormat,
  ConversionTargetFormat,
} from "./convert.js";
export type {
  ConsumerSurfaceFormat,
  FormatSupportSummary,
  GeneratorSupportSummary,
  ParserSupportSummary,
} from "./support-matrix.js";
