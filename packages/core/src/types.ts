export type ScalarKind = "string" | "integer" | "number" | "boolean";
export type UnknownReason =
  | "top-level-null"
  | "empty-array-element"
  | "null-only-field"
  | "empty-array-only-field";

export interface BaseNode {
  kind: string;
}

export interface IdentifierName {
  source: string;
  words: string[];
}

export interface ScalarTypeNode extends BaseNode {
  kind: "scalar";
  scalar: ScalarKind;
}

export interface UnknownTypeNode extends BaseNode {
  kind: "unknown";
  reason?: UnknownReason;
  nullable: boolean;
}

export interface FieldNode extends BaseNode {
  kind: "field";
  name: IdentifierName;
  required: boolean;
  nullable: boolean;
  type: TypeNode;
}

export interface ObjectTypeNode extends BaseNode {
  kind: "object";
  fields: FieldNode[];
}

export interface ArrayTypeNode extends BaseNode {
  kind: "array";
  elementType: TypeNode;
}

export type TypeNode =
  | ScalarTypeNode
  | UnknownTypeNode
  | ObjectTypeNode
  | ArrayTypeNode;

export interface SchemaDocument {
  version: "0.1";
  kind: "document";
  name: IdentifierName;
  root: TypeNode;
}
