import type {
  ValueArrayNode,
  ValueNode,
  ValueObjectNode,
  ValueScalarNode,
} from "./types.js";

export function isValueScalarNode(node: ValueNode): node is ValueScalarNode {
  return (
    node.kind === "string" ||
    node.kind === "number" ||
    node.kind === "boolean" ||
    node.kind === "null"
  );
}

export function isValueArrayNode(node: ValueNode): node is ValueArrayNode {
  return node.kind === "array";
}

export function isValueObjectNode(node: ValueNode): node is ValueObjectNode {
  return node.kind === "object";
}
