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
