export type ScalarKind = "string" | "integer" | "number" | "boolean";
export type SchemaLiteralValue = string | number | boolean;
export type UnknownReason =
  | "empty-array-element"
  | "empty-array-only-field";

export interface SchemaBaseNode {
  kind: string;
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
  reason?: UnknownReason;
  nullable: boolean;
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
  | SchemaUnionNode
  | SchemaTupleNode
  | SchemaRecordNode
  | SchemaNullNode
  | SchemaUnknownNode
  | SchemaObjectNode
  | SchemaArrayNode;

export interface SchemaDocument {
  version: "0.1";
  kind: "document";
  name: IdentifierName;
  root: SchemaNode;
}
