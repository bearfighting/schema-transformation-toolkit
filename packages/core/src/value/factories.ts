import type {
  ValueArrayNode,
  ValueDocument,
  ValueNode,
  ValueObjectField,
  ValueObjectNode,
  ValueScalar,
  ValueScalarNode,
} from "./types.js";

export function valueScalarNode(value: ValueScalar): ValueScalarNode {
  if (value === null) {
    return {
      kind: "null",
      value: null,
    };
  }

  if (typeof value === "string") {
    return {
      kind: "string",
      value,
    };
  }

  if (typeof value === "number") {
    return {
      kind: "number",
      value,
    };
  }

  return {
    kind: "boolean",
    value,
  };
}

export function valueArrayNode(items: ValueNode[]): ValueArrayNode {
  return {
    kind: "array",
    items,
  };
}

export function valueObjectField(
  name: string,
  value: ValueNode,
): ValueObjectField {
  return {
    name,
    value,
  };
}

export function valueObjectNode(fields: ValueObjectField[]): ValueObjectNode {
  return {
    kind: "object",
    fields,
  };
}

export function valueDocument(name: string, root: ValueNode): ValueDocument {
  return {
    kind: "value-document",
    name,
    root,
  };
}
