import type {
  ArrayTypeNode,
  ObjectTypeNode,
  ScalarTypeNode,
  UnknownTypeNode,
  TypeNode
} from "./types.js";

export function isScalarTypeNode(node: TypeNode): node is ScalarTypeNode {
  return node.kind === "scalar";
}

export function isUnknownTypeNode(node: TypeNode): node is UnknownTypeNode {
  return node.kind === "unknown";
}

export function isObjectTypeNode(node: TypeNode): node is ObjectTypeNode {
  return node.kind === "object";
}

export function isArrayTypeNode(node: TypeNode): node is ArrayTypeNode {
  return node.kind === "array";
}
