import type {
  FieldNode,
  ObjectTypeNode,
  ScalarTypeNode,
  UnknownTypeNode,
  TypeNode,
} from "@aio/core";
import { isNumericScalar } from "./shared.js";
import { JsonInferenceError } from "./errors.js";

export function mergeTypeNodes(
  left: TypeNode,
  right: TypeNode,
  context: string,
): TypeNode {
  if (left.kind !== right.kind) {
    throw new JsonInferenceError(
      "unsupported-mixed-types",
      `The input is valid JSON, but ${context} do not share a common inferable type in AST v0.`,
    );
  }

  if (left.kind === "scalar" && right.kind === "scalar") {
    return mergeScalarTypeNodes(left, right, context);
  }

  if (left.kind === "unknown" && right.kind === "unknown") {
    return mergeUnknownTypeNodes(left, right);
  }

  if (left.kind === "array" && right.kind === "array") {
    left.elementType = mergeTypeNodes(
      left.elementType,
      right.elementType,
      context,
    );
    return left;
  }

  if (left.kind === "object" && right.kind === "object") {
    return mergeObjectTypeNodes(left, right, context);
  }

  throw new JsonInferenceError(
    "unsupported-mixed-types",
    `The input is valid JSON, but ${context} do not share a common inferable type in AST v0.`,
  );
}

function mergeScalarTypeNodes(
  left: ScalarTypeNode,
  right: ScalarTypeNode,
  context: string,
): ScalarTypeNode {
  if (left.scalar === right.scalar) {
    return left;
  }

  if (isNumericScalar(left.scalar) && isNumericScalar(right.scalar)) {
    left.scalar = "number";
    return left;
  }

  throw new JsonInferenceError(
    "unsupported-mixed-types",
    `The input is valid JSON, but ${context} do not share a common inferable type in AST v0.`,
  );
}

function mergeObjectTypeNodes(
  left: ObjectTypeNode,
  right: ObjectTypeNode,
  context: string,
): ObjectTypeNode {
  const fieldMap = new Map<string, FieldNode>();

  for (const field of left.fields) {
    fieldMap.set(field.name.source, field);
  }

  for (const rightField of right.fields) {
    const leftField = fieldMap.get(rightField.name.source);

    if (!leftField) {
      fieldMap.set(rightField.name.source, {
        ...rightField,
        required: false,
      });
      continue;
    }

    leftField.type = mergeTypeNodes(leftField.type, rightField.type, context);
    leftField.nullable = leftField.nullable || rightField.nullable;
  }

  for (const leftField of left.fields) {
    if (
      !right.fields.some((field) => field.name.source === leftField.name.source)
    ) {
      leftField.required = false;
    }
  }

  left.fields = Array.from(fieldMap.values()).sort((leftField, rightField) =>
    leftField.name.source.localeCompare(rightField.name.source),
  );

  return left;
}

function mergeUnknownTypeNodes(
  left: UnknownTypeNode,
  right: UnknownTypeNode,
): UnknownTypeNode {
  left.nullable = left.nullable || right.nullable;
  if (left.reason === undefined && right.reason !== undefined) {
    left.reason = right.reason;
  }

  return left;
}
