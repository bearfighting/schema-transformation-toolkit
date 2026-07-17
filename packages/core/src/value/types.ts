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
