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
  createSchemaDefinitionIndex,
  createSchemaDefinitionIndexFromLookup,
  resolveSchemaReference,
} from "./definitions.js";
export {
  appendSchemaPath,
  createDefinitionSchemaPath,
  createRootSchemaPath,
  schemaPathSegmentToDiagnosticToken,
  schemaPathToDiagnosticPath,
} from "./path.js";

export {
  normalizeSchemaDefinitions,
  normalizeSchemaDocument,
  normalizeSchemaDocumentFromRoot,
  normalizeSchemaDocumentStructure,
  normalizeSchemaNode,
} from "./normalize.js";

export {
  transformSchemaDocument,
  transformSchemaDocumentFromRoot,
  transformSchemaDocumentStructure,
  transformSchemaDefinitions,
  transformSchemaNode,
} from "./transform.js";

export type {
  SchemaDefinitionIndex,
  SchemaReferenceResolution,
} from "./definitions.js";

export type { SchemaPath, SchemaPathSegment } from "./path.js";

export type {
  SchemaTransformContext,
  SchemaTransformReachabilityMode,
  SchemaTransformOptions,
  SchemaTransformReferenceMode,
  SchemaTransformer,
} from "./transform.js";

export {
  walkSchemaDefinitions,
  walkSchemaDocument,
  walkSchemaDocumentFromRoot,
  walkSchemaDocumentStructure,
  walkSchemaNode,
} from "./traversal.js";

export type {
  SchemaReferenceVisitMode,
  SchemaReferenceFrame,
  SchemaWalkControl,
  SchemaDefinitionWalkContext,
  SchemaFieldWalkContext,
  SchemaWalkContext,
  SchemaWalkNodeContext,
  SchemaWalkOptions,
  SchemaReferenceTraversalStatus,
  SchemaTupleElementWalkContext,
  SchemaWalkReferenceMode,
  SchemaWalkVia,
  SchemaWalkVisitor,
} from "./traversal.js";

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
