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

export function isSchemaScalarNode(node: SchemaNode): node is SchemaScalarNode {
  return node.kind === "scalar";
}

export function isSchemaLiteralNode(
  node: SchemaNode,
): node is SchemaLiteralNode {
  return node.kind === "literal";
}

export function isSchemaReferenceNode(
  node: SchemaNode,
): node is SchemaReferenceNode {
  return node.kind === "reference";
}

export function isSchemaUnionNode(node: SchemaNode): node is SchemaUnionNode {
  return node.kind === "union";
}

export function isSchemaTupleNode(node: SchemaNode): node is SchemaTupleNode {
  return node.kind === "tuple";
}

export function isSchemaRecordNode(node: SchemaNode): node is SchemaRecordNode {
  return node.kind === "record";
}

export function isSchemaNullNode(node: SchemaNode): node is SchemaNullNode {
  return node.kind === "null";
}

export function isSchemaUnknownNode(
  node: SchemaNode,
): node is SchemaUnknownNode {
  return node.kind === "unknown";
}

export function isSchemaObjectNode(node: SchemaNode): node is SchemaObjectNode {
  return node.kind === "object";
}

export function isSchemaArrayNode(node: SchemaNode): node is SchemaArrayNode {
  return node.kind === "array";
}
