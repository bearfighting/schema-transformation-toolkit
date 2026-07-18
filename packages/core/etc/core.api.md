# API Snapshot: @aio/core

Entry: packages/core/src/index.ts

## packages/core/src/constraint/factories.d.ts

```ts
import type {
  Constraint,
  ConstraintClause,
  ConstraintDocument,
  ConstraintEntry,
  ConstraintSeverity,
  ConstraintTarget,
  ConstraintTargetKind,
} from "./types.js";
export declare function constraintTarget(
  kind: ConstraintTargetKind,
  path?: string[],
): ConstraintTarget;
export declare function constraint(
  kind: string,
  options?: {
    severity?: Constraint["severity"];
    message?: string;
    value?: unknown;
    evidence?: Record<string, unknown>;
  },
): Constraint;
export declare function constraintEntry(
  target: ConstraintTarget,
  constraints: Constraint[],
): ConstraintEntry;
export declare function constraintClause(
  kind: string,
  path: string[],
  message: string,
  severity?: ConstraintSeverity,
  evidence?: Record<string, unknown>,
): ConstraintClause;
export declare function constraintDocument(
  name: string,
  entries?: ConstraintEntry[],
): ConstraintDocument;
```

## packages/core/src/constraint/guards.d.ts

```ts
import type {
  Constraint,
  ConstraintClause,
  ConstraintDocument,
  ConstraintEntry,
  ConstraintTarget,
} from "./types.js";
export declare function isConstraintTarget(
  value: unknown,
): value is ConstraintTarget;
export declare function isConstraint(value: unknown): value is Constraint;
export declare function isConstraintEntry(
  value: unknown,
): value is ConstraintEntry;
export declare function isConstraintClause(
  value: unknown,
): value is ConstraintClause;
export declare function isConstraintDocument(
  value: unknown,
): value is ConstraintDocument;
```

## packages/core/src/constraint/index.d.ts

```ts
export type {
  Constraint,
  ConstraintClause,
  ConstraintDocument,
  ConstraintEntry,
  ConstraintSeverity,
  ConstraintTarget,
  ConstraintTargetKind,
} from "./types.js";
export {
  constraint,
  constraintClause,
  constraintDocument,
  constraintEntry,
  constraintTarget,
} from "./factories.js";
export {
  isConstraint,
  isConstraintClause,
  isConstraintDocument,
  isConstraintEntry,
  isConstraintTarget,
} from "./guards.js";
```

## packages/core/src/constraint/types.d.ts

```ts
export type ConstraintSeverity = "info" | "warning" | "error";
export type ConstraintTargetKind =
  "document" | "root" | "definition" | "field" | "node";
export interface ConstraintTarget {
  kind: ConstraintTargetKind;
  path: string[];
}
export interface Constraint {
  kind: string;
  severity?: ConstraintSeverity;
  message?: string;
  value?: unknown;
  evidence?: Record<string, unknown>;
}
export interface ConstraintEntry {
  target: ConstraintTarget;
  constraints: Constraint[];
}
export type ConstraintClause = ConstraintEntry;
export interface ConstraintDocument {
  kind: "constraint-document";
  name: string;
  entries: ConstraintEntry[];
}
```

## packages/core/src/index.d.ts

```ts
export * from "./value/index.js";
export * from "./shape/index.js";
export * from "./constraint/index.js";
export * from "./model/index.js";
export * from "./pipeline/index.js";
export * from "./schema/index.js";
export * from "./shared/index.js";
```

## packages/core/src/model/factories.d.ts

```ts
import type { ConstraintDocument } from "../constraint/types.js";
import type { ShapeDocument } from "../shape/index.js";
import type { ValueDocument } from "../value/types.js";
import type { IrModel } from "./types.js";
export declare function irModel(
  name: string,
  options?: {
    value?: ValueDocument;
    shape?: ShapeDocument;
    constraints?: ConstraintDocument;
  },
): IrModel;
```

## packages/core/src/model/index.d.ts

```ts
export type { IrModel } from "./types.js";
export { irModel } from "./factories.js";
```

## packages/core/src/model/types.d.ts

```ts
import type { ConstraintDocument } from "../constraint/types.js";
import type { ShapeDocument } from "../shape/index.js";
import type { ValueDocument } from "../value/types.js";
export interface IrModel {
  name: string;
  value?: ValueDocument;
  shape?: ShapeDocument;
  constraints?: ConstraintDocument;
}
```

## packages/core/src/pipeline/contracts.d.ts

```ts
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
```

## packages/core/src/pipeline/index.d.ts

```ts
export type {
  ConversionReport,
  ConversionCapability,
  GeneratorCapabilities,
  ParserCapabilities,
  ConversionRoute,
  ConversionRouteCapabilities,
  IrKind,
  PipelineStage,
  PipelineStageKind,
  SemanticLoss,
  SemanticLossPhase,
} from "./contracts.js";
```

## packages/core/src/schema/contracts.d.ts

```ts
import type {
  SchemaDiagnostic,
  SchemaDocument,
  SchemaSemanticNote,
} from "./types.js";
import type { ConstraintDocument } from "../constraint/types.js";
export interface ParseOptions {
  name?: string;
}
export interface PreparedOptions<TResolved> {
  resolved: TResolved;
  warnings: string[];
  errors: string[];
}
export interface ConfiguredParser<
  TParser extends SchemaParser = SchemaParser,
  TResolved = unknown,
> {
  parser: TParser;
  prepared: PreparedOptions<TResolved>;
}
export interface ParseSuccessResult {
  ok: true;
  document: SchemaDocument;
  constraints?: ConstraintDocument;
  diagnostics?: SchemaDiagnostic[];
  semanticNotes?: SchemaSemanticNote[];
}
export interface ParseFailureResult<TCode extends string = string> {
  ok: false;
  code: TCode;
  message: string;
  diagnostics?: SchemaDiagnostic[];
}
export type ParseResult<TCode extends string = string> =
  ParseSuccessResult | ParseFailureResult<TCode>;
export interface SchemaParser<
  TInput = string,
  TOptions extends ParseOptions = ParseOptions,
  TResult extends ParseResult = ParseResult,
> {
  format: string;
  parse(input: TInput, options?: TOptions): TResult;
}
export type GenerateOptions = Record<never, never>;
export interface ConfiguredGenerator<
  TGenerator extends SchemaGenerator<
    unknown,
    GenerateOptions,
    GenerateResult<unknown>
  > = SchemaGenerator,
  TResolved = unknown,
> {
  generator: TGenerator;
  prepared: PreparedOptions<TResolved>;
}
export interface GenerateSuccessResult<TOutput = string> {
  ok: true;
  output: TOutput;
  diagnostics?: SchemaDiagnostic[];
  semanticNotes?: SchemaSemanticNote[];
}
export interface GenerateFailureResult<TCode extends string = string> {
  ok: false;
  code: TCode;
  message: string;
  diagnostics?: SchemaDiagnostic[];
}
export type GenerateResult<TOutput = string, TCode extends string = string> =
  GenerateSuccessResult<TOutput> | GenerateFailureResult<TCode>;
export interface SchemaGenerator<
  TOutput = string,
  TOptions extends GenerateOptions = GenerateOptions,
  TResult extends GenerateResult<TOutput> = GenerateResult<TOutput>,
> {
  target: string;
  generate(document: SchemaDocument, options?: TOptions): TResult;
}
```

## packages/core/src/schema/equivalence.d.ts

```ts
import type { SchemaNode } from "./types.js";
export declare function areEquivalentSchemaNodes(
  left: SchemaNode,
  right: SchemaNode,
): boolean;
```

## packages/core/src/schema/factories.d.ts

```ts
import type {
  ScalarKind,
  SchemaLiteralValue,
  SchemaArrayNode,
  SchemaDocument,
  SchemaDefinition,
  SchemaFieldNode,
  SchemaLiteralNode,
  SchemaNullNode,
  SchemaNode,
  SchemaObjectNode,
  SchemaReferenceNode,
  SchemaRecordNode,
  SchemaScalarNode,
  SchemaTupleElement,
  SchemaTupleNode,
  SchemaUnionNode,
  SchemaUnknownEvidence,
  SchemaUnknownNode,
  UnknownReason,
} from "./types.js";
import { type IdentifierInput } from "./identifiers.js";
export declare function schemaScalarNode(scalar: ScalarKind): SchemaScalarNode;
export declare function schemaLiteralNode(
  value: SchemaLiteralValue,
): SchemaLiteralNode;
export declare function schemaReferenceNode(name: string): SchemaReferenceNode;
export declare function schemaUnionNode(members: SchemaNode[]): SchemaUnionNode;
export declare function schemaDefinition(
  name: IdentifierInput,
  type: SchemaNode,
): SchemaDefinition;
export declare function schemaTupleElement(
  type: SchemaNode,
  options?: {
    required?: boolean;
  },
): SchemaTupleElement;
export declare function schemaTupleNode(
  elements: Array<SchemaNode | SchemaTupleElement>,
): SchemaTupleNode;
export declare function schemaRecordNode(
  key: SchemaNode,
  value: SchemaNode,
): SchemaRecordNode;
export declare function schemaNullNode(): SchemaNullNode;
export declare function schemaUnknownNode(options?: {
  reason?: UnknownReason;
  nullable?: boolean;
  evidence?: SchemaUnknownEvidence;
}): SchemaUnknownNode;
export declare function schemaFieldNode(
  name: IdentifierInput,
  type: SchemaNode,
  options?: {
    required?: boolean;
    nullable?: boolean;
  },
): SchemaFieldNode;
export declare function schemaObjectNode(
  fields: SchemaFieldNode[],
): SchemaObjectNode;
export declare function schemaArrayNode(
  elementType: SchemaNode,
): SchemaArrayNode;
export declare function schemaDocument(
  name: IdentifierInput,
  root: SchemaNode,
  options?: {
    definitions?: SchemaDefinition[];
  },
): SchemaDocument;
```

## packages/core/src/schema/guards.d.ts

```ts
import type {
  SchemaArrayNode,
  SchemaReferenceNode,
  SchemaLiteralNode,
  SchemaNullNode,
  SchemaNode,
  SchemaObjectNode,
  SchemaRecordNode,
  SchemaScalarNode,
  SchemaTupleNode,
  SchemaUnionNode,
  SchemaUnknownNode,
} from "./types.js";
export declare function isSchemaScalarNode(
  node: SchemaNode,
): node is SchemaScalarNode;
export declare function isSchemaLiteralNode(
  node: SchemaNode,
): node is SchemaLiteralNode;
export declare function isSchemaReferenceNode(
  node: SchemaNode,
): node is SchemaReferenceNode;
export declare function isSchemaUnionNode(
  node: SchemaNode,
): node is SchemaUnionNode;
export declare function isSchemaTupleNode(
  node: SchemaNode,
): node is SchemaTupleNode;
export declare function isSchemaRecordNode(
  node: SchemaNode,
): node is SchemaRecordNode;
export declare function isSchemaNullNode(
  node: SchemaNode,
): node is SchemaNullNode;
export declare function isSchemaUnknownNode(
  node: SchemaNode,
): node is SchemaUnknownNode;
export declare function isSchemaObjectNode(
  node: SchemaNode,
): node is SchemaObjectNode;
export declare function isSchemaArrayNode(
  node: SchemaNode,
): node is SchemaArrayNode;
```

## packages/core/src/schema/identifiers.d.ts

```ts
import type { IdentifierName } from "./types.js";
export type IdentifierInput = string | IdentifierName;
export declare function identifierName(name: IdentifierInput): IdentifierName;
export declare function splitIdentifierWords(value: string): string[];
export declare function normalizeWords(
  words: string[],
  fallbackSource: string,
): string[];
```

## packages/core/src/schema/index.d.ts

```ts
export type {
  IdentifierName,
  ScalarKind,
  SchemaLiteralValue,
  SchemaArrayNode,
  SchemaBaseNode,
  SchemaDefinition,
  SchemaDiagnostic,
  SchemaDiagnosticNodeKind,
  SchemaDiagnosticSeverity,
  SchemaDocument,
  SchemaFieldNode,
  SchemaLiteralNode,
  SchemaNullNode,
  SchemaNode,
  SchemaNodeKind,
  SchemaObjectNode,
  SchemaReferenceNode,
  SchemaRecordNode,
  SchemaScalarNode,
  SchemaSemanticNote,
  SchemaSemanticNoteKind,
  SchemaSemanticNoteLayer,
  SchemaTupleElement,
  SchemaTupleNode,
  SchemaUnionNode,
  SchemaUnknownEvidence,
  SchemaUnknownNode,
  SchemaValidationFailureResult,
  SchemaValidationResult,
  SchemaValidationSuccessResult,
  UnknownReason,
} from "./types.js";
export {
  schemaArrayNode,
  schemaDefinition,
  schemaDocument,
  schemaFieldNode,
  schemaLiteralNode,
  schemaNullNode,
  schemaObjectNode,
  schemaReferenceNode,
  schemaRecordNode,
  schemaScalarNode,
  schemaTupleElement,
  schemaTupleNode,
  schemaUnionNode,
  schemaUnknownNode,
} from "./factories.js";
export { identifierName } from "./identifiers.js";
export { areEquivalentSchemaNodes } from "./equivalence.js";
export {
  tryValidateSchemaDocument,
  tryValidateSchemaFieldNullability,
  validateSchemaDocument,
  validateSchemaFieldNullability,
} from "./validation.js";
export {
  isSchemaArrayNode,
  isSchemaLiteralNode,
  isSchemaNullNode,
  isSchemaObjectNode,
  isSchemaReferenceNode,
  isSchemaRecordNode,
  isSchemaScalarNode,
  isSchemaTupleNode,
  isSchemaUnionNode,
  isSchemaUnknownNode,
} from "./guards.js";
export type {
  ConfiguredGenerator,
  ConfiguredParser,
  GenerateFailureResult,
  GenerateOptions,
  GenerateResult,
  GenerateSuccessResult,
  ParseFailureResult,
  ParseOptions,
  ParseResult,
  ParseSuccessResult,
  PreparedOptions,
  SchemaGenerator,
  SchemaParser,
} from "./contracts.js";
```

## packages/core/src/schema/types.d.ts

```ts
export type ScalarKind = "string" | "integer" | "number" | "boolean";
export type SchemaLiteralValue = string | number | boolean;
export type UnknownReason =
  | "no-evidence"
  | "empty-array-element"
  | "empty-array-only-field"
  | "mixed-types-collapsed";
export interface SchemaUnknownEvidence {
  source?: "parser-json";
  detail?: string;
  observedKinds?: string[];
}
export type SchemaDiagnosticSeverity = "error" | "warning" | "info";
export type SchemaNodeKind =
  | "scalar"
  | "literal"
  | "reference"
  | "union"
  | "tuple"
  | "record"
  | "null"
  | "unknown"
  | "field"
  | "object"
  | "array";
export type SchemaDiagnosticNodeKind =
  | SchemaNodeKind
  | "document"
  | "definition"
  | "entry"
  | "type"
  | "type-member"
  | "property-name"
  | "type-reference";
export interface SchemaDiagnostic {
  severity: SchemaDiagnosticSeverity;
  code: string;
  message: string;
  path?: string[];
  nodeKind?: SchemaDiagnosticNodeKind;
  source?: string;
  evidence?: unknown;
}
export type SchemaSemanticNoteKind =
  "normalization" | "loss" | "widening" | "policy";
export type SchemaSemanticNoteLayer =
  "value" | "shape" | "constraint" | "target";
export interface SchemaSemanticNote {
  kind: SchemaSemanticNoteKind;
  code: string;
  message: string;
  path?: string[];
  nodeKind?: SchemaDiagnosticNodeKind;
  source?: string;
  layer?: SchemaSemanticNoteLayer;
  evidence?: unknown;
}
export interface SchemaValidationSuccessResult {
  ok: true;
}
export interface SchemaValidationFailureResult {
  ok: false;
  diagnostics: SchemaDiagnostic[];
}
export type SchemaValidationResult =
  SchemaValidationSuccessResult | SchemaValidationFailureResult;
export interface SchemaBaseNode {
  kind: SchemaNodeKind;
}
export interface IdentifierName {
  source: string;
  words: string[];
}
export interface SchemaScalarNode extends SchemaBaseNode {
  kind: "scalar";
  scalar: ScalarKind;
}
export interface SchemaLiteralNode extends SchemaBaseNode {
  kind: "literal";
  value: SchemaLiteralValue;
}
export interface SchemaReferenceNode extends SchemaBaseNode {
  kind: "reference";
  name: string;
}
export interface SchemaUnionNode extends SchemaBaseNode {
  kind: "union";
  members: SchemaNode[];
}
export interface SchemaTupleElement {
  required: boolean;
  type: SchemaNode;
}
export interface SchemaTupleNode extends SchemaBaseNode {
  kind: "tuple";
  elements: SchemaTupleElement[];
}
export interface SchemaRecordNode extends SchemaBaseNode {
  kind: "record";
  key: SchemaNode;
  value: SchemaNode;
}
export interface SchemaNullNode extends SchemaBaseNode {
  kind: "null";
}
export interface SchemaUnknownNode extends SchemaBaseNode {
  kind: "unknown";
  reason: UnknownReason;
  nullable: boolean;
  evidence?: SchemaUnknownEvidence;
}
export interface SchemaFieldNode extends SchemaBaseNode {
  kind: "field";
  name: IdentifierName;
  required: boolean;
  nullable: boolean;
  type: SchemaNode;
}
export interface SchemaObjectNode extends SchemaBaseNode {
  kind: "object";
  fields: SchemaFieldNode[];
}
export interface SchemaArrayNode extends SchemaBaseNode {
  kind: "array";
  elementType: SchemaNode;
}
export type SchemaNode =
  | SchemaScalarNode
  | SchemaLiteralNode
  | SchemaReferenceNode
  | SchemaUnionNode
  | SchemaTupleNode
  | SchemaRecordNode
  | SchemaNullNode
  | SchemaUnknownNode
  | SchemaObjectNode
  | SchemaArrayNode;
export interface SchemaDefinition {
  name: IdentifierName;
  type: SchemaNode;
}
export interface SchemaDocument {
  version: "0.1";
  kind: "document";
  name: IdentifierName;
  definitions: SchemaDefinition[];
  root: SchemaNode;
}
```

## packages/core/src/schema/validation.d.ts

```ts
import type {
  SchemaDocument,
  SchemaNode,
  SchemaValidationResult,
} from "./types.js";
export declare function validateSchemaDocument(document: SchemaDocument): void;
export declare function validateSchemaFieldNullability(type: SchemaNode): void;
export declare function tryValidateSchemaDocument(
  document: SchemaDocument,
): SchemaValidationResult;
export declare function tryValidateSchemaFieldNullability(
  type: SchemaNode,
): SchemaValidationResult;
```

## packages/core/src/shape/index.d.ts

```ts
export type {
  SchemaArrayNode as ShapeArrayNode,
  SchemaBaseNode as ShapeBaseNode,
  SchemaDefinition as ShapeDefinition,
  SchemaDocument as ShapeDocument,
  SchemaFieldNode as ShapeFieldNode,
  SchemaLiteralNode as ShapeLiteralNode,
  SchemaNode as ShapeNode,
  SchemaNodeKind as ShapeNodeKind,
  SchemaNullNode as ShapeNullNode,
  SchemaObjectNode as ShapeObjectNode,
  SchemaReferenceNode as ShapeReferenceNode,
  SchemaRecordNode as ShapeRecordNode,
  SchemaScalarNode as ShapeScalarNode,
  SchemaTupleElement as ShapeTupleElement,
  SchemaTupleNode as ShapeTupleNode,
  SchemaUnionNode as ShapeUnionNode,
  SchemaUnknownNode as ShapeUnknownNode,
} from "../schema/types.js";
export type {
  IdentifierName,
  ScalarKind,
  SchemaArrayNode,
  SchemaBaseNode,
  SchemaDefinition,
  SchemaDiagnostic,
  SchemaDiagnosticNodeKind,
  SchemaDiagnosticSeverity,
  SchemaDocument,
  SchemaFieldNode,
  SchemaLiteralNode,
  SchemaLiteralValue,
  SchemaNode,
  SchemaNodeKind,
  SchemaNullNode,
  SchemaObjectNode,
  SchemaReferenceNode,
  SchemaRecordNode,
  SchemaScalarNode,
  SchemaSemanticNote,
  SchemaSemanticNoteKind,
  SchemaSemanticNoteLayer,
  SchemaTupleElement,
  SchemaTupleNode,
  SchemaUnionNode,
  SchemaUnknownEvidence,
  SchemaUnknownNode,
  SchemaValidationFailureResult,
  SchemaValidationResult,
  SchemaValidationSuccessResult,
  UnknownReason,
} from "../schema/types.js";
export {
  areEquivalentSchemaNodes,
  identifierName,
  isSchemaArrayNode,
  isSchemaLiteralNode,
  isSchemaNullNode,
  isSchemaObjectNode,
  isSchemaRecordNode,
  isSchemaReferenceNode,
  isSchemaScalarNode,
  isSchemaTupleNode,
  isSchemaUnionNode,
  isSchemaUnknownNode,
  schemaArrayNode,
  schemaDefinition,
  schemaDocument,
  schemaFieldNode,
  schemaLiteralNode,
  schemaNullNode,
  schemaObjectNode,
  schemaRecordNode,
  schemaReferenceNode,
  schemaScalarNode,
  schemaTupleElement,
  schemaTupleNode,
  schemaUnionNode,
  schemaUnknownNode,
  tryValidateSchemaDocument,
  tryValidateSchemaFieldNullability,
  validateSchemaDocument,
  validateSchemaFieldNullability,
} from "../schema/index.js";
export {
  schemaArrayNode as shapeArrayNode,
  schemaDefinition as shapeDefinition,
  schemaDocument as shapeDocument,
  schemaFieldNode as shapeFieldNode,
  schemaLiteralNode as shapeLiteralNode,
  schemaNullNode as shapeNullNode,
  schemaObjectNode as shapeObjectNode,
  schemaRecordNode as shapeRecordNode,
  schemaReferenceNode as shapeReferenceNode,
  schemaScalarNode as shapeScalarNode,
  schemaTupleElement as shapeTupleElement,
  schemaTupleNode as shapeTupleNode,
  schemaUnionNode as shapeUnionNode,
  schemaUnknownNode as shapeUnknownNode,
} from "../schema/index.js";
```

## packages/core/src/shared/index.d.ts

```ts
export {
  capitalizeWord,
  createNamingStrategy,
  getRenderableWords,
  normalizeIdentifier,
  renderIdentifierName,
  toCamelCase,
  toPascalCase,
  toSnakeCase,
} from "./naming.js";
export {
  createSchemaObservation,
  pushSchemaObservation,
} from "./observations.js";
export type {
  NamingStrategy,
  NamingStrategyOptions,
  NamingStyle,
  RenderIdentifierOptions,
} from "./naming.js";
export type {
  SchemaObservationOptions,
  SchemaObservationPair,
} from "./observations.js";
```

## packages/core/src/shared/naming.d.ts

```ts
import type { IdentifierName } from "../schema/types.js";
export type NamingStyle = "camel" | "pascal" | "snake";
export type ReservedWordHandling = "suffix" | "prefix" | "quoted" | "raw";
export interface RenderIdentifierOptions {
  style: NamingStyle;
  fallback?: "source" | "quoted";
  emptyFallback?: string;
  invalidPrefix?: string;
  reservedWords?: string[];
  reservedWordHandling?: ReservedWordHandling;
  reservedWordSuffix?: string;
  reservedWordPrefix?: string;
  rawIdentifierPrefix?: string;
}
export interface NamingStrategy {
  renderTypeName(name: IdentifierName): string;
  renderFieldName(name: IdentifierName): string;
}
export interface NamingStrategyOptions {
  typeName: RenderIdentifierOptions;
  fieldName: RenderIdentifierOptions;
}
export declare function renderIdentifierName(
  name: IdentifierName,
  options: RenderIdentifierOptions,
): string;
export declare function getRenderableWords(name: IdentifierName): string[];
export declare function toCamelCase(words: string[]): string;
export declare function toPascalCase(words: string[]): string;
export declare function toSnakeCase(words: string[]): string;
export declare function capitalizeWord(word: string): string;
export declare function createNamingStrategy(
  options: NamingStrategyOptions,
): NamingStrategy;
export declare function normalizeIdentifier(
  identifier: string,
  options: Pick<
    RenderIdentifierOptions,
    | "invalidPrefix"
    | "reservedWords"
    | "reservedWordHandling"
    | "reservedWordSuffix"
    | "reservedWordPrefix"
    | "rawIdentifierPrefix"
  >,
): string;
```

## packages/core/src/shared/observations.d.ts

```ts
import type {
  SchemaDiagnostic,
  SchemaDiagnosticNodeKind,
  SchemaDiagnosticSeverity,
  SchemaSemanticNote,
  SchemaSemanticNoteKind,
  SchemaSemanticNoteLayer,
} from "../schema/types.js";
export interface SchemaObservationOptions {
  severity: SchemaDiagnosticSeverity;
  kind: SchemaSemanticNoteKind;
  code: string;
  message: string;
  source: string;
  path?: string[];
  nodeKind?: SchemaDiagnosticNodeKind;
  layer?: SchemaSemanticNoteLayer;
  evidence?: unknown;
}
export interface SchemaObservationPair {
  diagnostic: SchemaDiagnostic;
  semanticNote: SchemaSemanticNote;
}
export declare function createSchemaObservation(
  options: SchemaObservationOptions,
): SchemaObservationPair;
export declare function pushSchemaObservation(
  diagnostics: SchemaDiagnostic[],
  semanticNotes: SchemaSemanticNote[],
  options: SchemaObservationOptions,
): void;
```

## packages/core/src/value/factories.d.ts

```ts
import type {
  ValueArrayNode,
  ValueDocument,
  ValueNode,
  ValueObjectField,
  ValueObjectNode,
  ValueScalar,
  ValueScalarNode,
} from "./types.js";
export declare function valueScalarNode(value: ValueScalar): ValueScalarNode;
export declare function valueArrayNode(items: ValueNode[]): ValueArrayNode;
export declare function valueObjectField(
  name: string,
  value: ValueNode,
): ValueObjectField;
export declare function valueObjectNode(
  fields: ValueObjectField[],
): ValueObjectNode;
export declare function valueDocument(
  name: string,
  root: ValueNode,
): ValueDocument;
```

## packages/core/src/value/guards.d.ts

```ts
import type {
  ValueArrayNode,
  ValueNode,
  ValueObjectNode,
  ValueScalarNode,
} from "./types.js";
export declare function isValueScalarNode(
  node: ValueNode,
): node is ValueScalarNode;
export declare function isValueArrayNode(
  node: ValueNode,
): node is ValueArrayNode;
export declare function isValueObjectNode(
  node: ValueNode,
): node is ValueObjectNode;
```

## packages/core/src/value/index.d.ts

```ts
export type {
  ValueArrayNode,
  ValueDocument,
  ValueNode,
  ValueObjectField,
  ValueObjectNode,
  ValueScalar,
  ValueScalarNode,
} from "./types.js";
export {
  valueArrayNode,
  valueDocument,
  valueObjectField,
  valueObjectNode,
  valueScalarNode,
} from "./factories.js";
export {
  isValueArrayNode,
  isValueObjectNode,
  isValueScalarNode,
} from "./guards.js";
```

## packages/core/src/value/types.d.ts

```ts
export type ValueScalar = string | number | boolean | null;
export interface ValueStringNode {
  kind: "string";
  value: string;
}
export interface ValueNumberNode {
  kind: "number";
  value: number;
}
export interface ValueBooleanNode {
  kind: "boolean";
  value: boolean;
}
export interface ValueNullNode {
  kind: "null";
  value: null;
}
export interface ValueArrayNode {
  kind: "array";
  items: ValueNode[];
}
export interface ValueObjectField {
  name: string;
  value: ValueNode;
}
export interface ValueObjectNode {
  kind: "object";
  fields: ValueObjectField[];
}
export type ValueScalarNode =
  ValueStringNode | ValueNumberNode | ValueBooleanNode | ValueNullNode;
export type ValueNode = ValueScalarNode | ValueArrayNode | ValueObjectNode;
export interface ValueDocument {
  kind: "value-document";
  name: string;
  root: ValueNode;
}
```
