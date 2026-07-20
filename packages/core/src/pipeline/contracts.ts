import type { SchemaDiagnostic, SchemaSemanticNote } from "../schema/types.js";

export type IrKind = "value" | "shape" | "constraint";
export type ConversionCapability =
  | "value-ir"
  | "shape-ir"
  | "constraint-ir"
  | "string-constraints"
  | "numeric-constraints"
  | "collection-constraints"
  | "object-constraints"
  | "portable-annotations";
export type SemanticLossPhase = "parse" | "transform" | "generate";

export interface SemanticLoss {
  code: string;
  message: string;
  severity: "info" | "warning" | "error";
  phase: SemanticLossPhase;
  lostCapability: ConversionCapability;
  sourcePath?: string[];
  targetFormat?: string;
  evidence?: unknown;
}

export interface ConversionReportStage<TFact> {
  parse?: TFact[];
  generate?: TFact[];
  all: TFact[];
}

export interface ConversionEntrySelection {
  mode: "implicit";
  entry: string;
  strategyCode: string;
  source?: string;
  path?: string[];
  evidence?: unknown;
}

export interface ConversionPolicyDecision {
  phase: "parse" | "generate";
  code: string;
  message: string;
  source?: string;
  path?: string[];
  evidence?: unknown;
}

export interface ConversionSemanticCaveat {
  phase: "parse" | "generate";
  kind: Exclude<SchemaSemanticNote["kind"], "policy">;
  code: string;
  message: string;
  source?: string;
  path?: string[];
  layer?: SchemaSemanticNote["layer"];
  evidence?: unknown;
}

export interface ParserCapabilities {
  format: string;
  producesIr: IrKind[];
  capabilities: ConversionCapability[];
}

export interface GeneratorCapabilities {
  target: string;
  consumesIr: IrKind[];
  supportsCapabilities: ConversionCapability[];
}

export interface ConversionReport {
  diagnostics?: ConversionReportStage<SchemaDiagnostic>;
  losses?: SemanticLoss[];
  preservedCapabilities?: ConversionCapability[];
  semanticNotes?: ConversionReportStage<SchemaSemanticNote>;
  semanticCaveats?: ConversionSemanticCaveat[];
  policyDecisions?: ConversionPolicyDecision[];
  entrySelection?: ConversionEntrySelection;
}

export type PipelineStageKind =
  | "parse-source"
  | "lower-to-value"
  | "infer-shape"
  | "derive-constraints"
  | "generate-target";

export interface PipelineStage {
  kind: PipelineStageKind;
  from: string;
  to: string;
  ir?: IrKind;
}

export interface ConversionRoute {
  sourceFormat: string;
  targetFormat: string;
  irSequence: IrKind[];
  stages: PipelineStage[];
}

export interface ConversionRouteCapabilities {
  supportsValueIr: boolean;
  supportsShapeIr: boolean;
  supportsConstraintIr: boolean;
  parserCapabilities: ConversionCapability[];
  generatorCapabilities: ConversionCapability[];
  preservedCapabilities: ConversionCapability[];
  potentiallyLostCapabilities: ConversionCapability[];
}
