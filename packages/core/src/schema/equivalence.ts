import type {
  SchemaFieldNode,
  SchemaNode,
  SchemaTupleElement,
} from "./types.js";

export function areEquivalentSchemaNodes(
  left: SchemaNode,
  right: SchemaNode,
): boolean {
  if (left.kind !== right.kind) {
    return false;
  }

  switch (left.kind) {
    case "scalar":
      return right.kind === "scalar" && left.scalar === right.scalar;
    case "literal":
      return right.kind === "literal" && Object.is(left.value, right.value);
    case "reference":
      return right.kind === "reference" && left.name === right.name;
    case "null":
      return right.kind === "null";
    case "tuple":
      return (
        right.kind === "tuple" &&
        left.elements.length === right.elements.length &&
        left.elements.every((element, index) =>
          areEquivalentTupleElements(element, right.elements[index]),
        )
      );
    case "record":
      return (
        right.kind === "record" &&
        areEquivalentSchemaNodes(left.key, right.key) &&
        areEquivalentSchemaNodes(left.value, right.value)
      );
    case "unknown":
      return (
        right.kind === "unknown" &&
        left.reason === right.reason &&
        left.nullable === right.nullable
      );
    case "array":
      return (
        right.kind === "array" &&
        areEquivalentSchemaNodes(left.elementType, right.elementType)
      );
    case "object":
      return (
        right.kind === "object" &&
        left.fields.length === right.fields.length &&
        left.fields.every((field, index) =>
          areEquivalentSchemaFields(field, right.fields[index]),
        )
      );
    case "union":
      return (
        right.kind === "union" &&
        left.members.length === right.members.length &&
        left.members.every((member) =>
          right.members.some((candidate) =>
            areEquivalentSchemaNodes(member, candidate),
          ),
        )
      );
  }
}

function areEquivalentTupleElements(
  left: SchemaTupleElement,
  right: SchemaTupleElement | undefined,
): boolean {
  return (
    right !== undefined &&
    left.required === right.required &&
    areEquivalentSchemaNodes(left.type, right.type)
  );
}

function areEquivalentSchemaFields(
  left: SchemaFieldNode,
  right: SchemaFieldNode | undefined,
): boolean {
  return (
    right !== undefined &&
    left.name.source === right.name.source &&
    left.required === right.required &&
    left.nullable === right.nullable &&
    areEquivalentSchemaNodes(left.type, right.type)
  );
}
