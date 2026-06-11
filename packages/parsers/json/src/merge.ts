import type {
  SchemaFieldNode,
  SchemaLiteralNode,
  SchemaNullNode,
  SchemaNode,
  SchemaObjectNode,
  SchemaRecordNode,
  SchemaScalarNode,
  SchemaTupleNode,
  SchemaUnionNode,
  SchemaUnknownNode,
} from "@aio/core";
import { schemaUnionNode } from "@aio/core";
import { isNumericScalar } from "./shared.js";
import { JsonInferenceError } from "./errors.js";
import type { JsonMixedTypeMode } from "./options.js";

export function mergeTypeNodes(
  left: SchemaNode,
  right: SchemaNode,
  context: string,
  mixedTypeMode: JsonMixedTypeMode = "error",
): SchemaNode {
  if (left.kind !== right.kind) {
    if (mixedTypeMode === "union") {
      return mergeAsUnion(left, right);
    }

    throw new JsonInferenceError(
      "unsupported-mixed-types",
      `The input is valid JSON, but ${context} do not share a common inferable type in AST v0.`,
    );
  }

  if (left.kind === "scalar" && right.kind === "scalar") {
    return mergeScalarTypeNodes(left, right, context, mixedTypeMode);
  }

  if (left.kind === "unknown" && right.kind === "unknown") {
    return mergeUnknownTypeNodes(left, right);
  }

  if (left.kind === "null" && right.kind === "null") {
    return mergeNullTypeNodes(left);
  }

  if (left.kind === "literal" && right.kind === "literal") {
    return mergeLiteralTypeNodes(left, right, mixedTypeMode);
  }

  if (left.kind === "tuple" && right.kind === "tuple") {
    return mergeTupleTypeNodes(left, right, context, mixedTypeMode);
  }

  if (left.kind === "record" && right.kind === "record") {
    return mergeRecordTypeNodes(left, right, context, mixedTypeMode);
  }

  if (left.kind === "union" || right.kind === "union") {
    return mergeAsUnion(left, right);
  }

  if (left.kind === "array" && right.kind === "array") {
    left.elementType = mergeTypeNodes(
      left.elementType,
      right.elementType,
      context,
      mixedTypeMode,
    );
    return left;
  }

  if (left.kind === "object" && right.kind === "object") {
    return mergeObjectTypeNodes(left, right, context, mixedTypeMode);
  }

  throw new JsonInferenceError(
    "unsupported-mixed-types",
    `The input is valid JSON, but ${context} do not share a common inferable type in AST v0.`,
  );
}

function mergeScalarTypeNodes(
  left: SchemaScalarNode,
  right: SchemaScalarNode,
  context: string,
  mixedTypeMode: JsonMixedTypeMode,
): SchemaNode {
  if (left.scalar === right.scalar) {
    return left;
  }

  if (isNumericScalar(left.scalar) && isNumericScalar(right.scalar)) {
    left.scalar = "number";
    return left;
  }

  if (mixedTypeMode === "union") {
    return mergeAsUnion(left, right);
  }

  throw new JsonInferenceError(
    "unsupported-mixed-types",
    `The input is valid JSON, but ${context} do not share a common inferable type in AST v0.`,
  );
}

function mergeObjectTypeNodes(
  left: SchemaObjectNode,
  right: SchemaObjectNode,
  context: string,
  mixedTypeMode: JsonMixedTypeMode,
): SchemaObjectNode {
  const fieldMap = new Map<string, SchemaFieldNode>();

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

    leftField.type = mergeTypeNodes(
      leftField.type,
      rightField.type,
      context,
      mixedTypeMode,
    );
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
  left: SchemaUnknownNode,
  right: SchemaUnknownNode,
): SchemaUnknownNode {
  left.nullable = left.nullable || right.nullable;
  if (left.reason === undefined && right.reason !== undefined) {
    left.reason = right.reason;
  }

  return left;
}

function mergeNullTypeNodes(left: SchemaNullNode): SchemaNullNode {
  return left;
}

function mergeLiteralTypeNodes(
  left: SchemaLiteralNode,
  right: SchemaLiteralNode,
  mixedTypeMode: JsonMixedTypeMode,
): SchemaNode {
  if (Object.is(left.value, right.value)) {
    return left;
  }

  if (mixedTypeMode === "union") {
    return mergeAsUnion(left, right);
  }

  throw createUnsupportedMixedTypesError("literals");
}

function mergeTupleTypeNodes(
  left: SchemaTupleNode,
  right: SchemaTupleNode,
  context: string,
  mixedTypeMode: JsonMixedTypeMode,
): SchemaNode {
  const maxLength = Math.max(left.elements.length, right.elements.length);

  left.elements = Array.from({ length: maxLength }, (_, index) => {
    const element = left.elements[index];
    const rightElement = right.elements[index];

    if (element === undefined && rightElement === undefined) {
      throw createUnsupportedMixedTypesError(context);
    }

    if (element === undefined) {
      return {
        required: false,
        type: rightElement!.type,
      };
    }

    if (rightElement === undefined) {
      return {
        required: false,
        type: element.type,
      };
    }

    try {
      return {
        required: element.required && rightElement.required,
        type: mergeTypeNodes(
          element.type,
          rightElement.type,
          `${context} tuple index ${index}`,
          mixedTypeMode,
        ),
      };
    } catch (error) {
      if (
        error instanceof JsonInferenceError &&
        error.code === "unsupported-mixed-types"
      ) {
        return {
          required: element.required && rightElement.required,
          type: mergeAsUnion(element.type, rightElement.type),
        };
      }

      throw error;
    }
  });

  return left;
}

function mergeRecordTypeNodes(
  left: SchemaRecordNode,
  right: SchemaRecordNode,
  context: string,
  mixedTypeMode: JsonMixedTypeMode,
): SchemaRecordNode {
  left.key = mergeTypeNodes(left.key, right.key, `${context} record keys`, mixedTypeMode);
  left.value = mergeTypeNodes(
    left.value,
    right.value,
    `${context} record values`,
    mixedTypeMode,
  );

  return left;
}

function mergeAsUnion(left: SchemaNode, right: SchemaNode): SchemaUnionNode {
  return schemaUnionNode([left, right]);
}

function areEquivalentSchemaNodes(left: SchemaNode, right: SchemaNode): boolean {
  if (left.kind !== right.kind) {
    return false;
  }

  switch (left.kind) {
    case "scalar":
      return right.kind === "scalar" && left.scalar === right.scalar;
    case "literal":
      return right.kind === "literal" && Object.is(left.value, right.value);
    case "null":
      return right.kind === "null";
    case "tuple":
      return (
        right.kind === "tuple" &&
        left.elements.length === right.elements.length &&
        left.elements.every((element, index) => {
          const rightElement = right.elements[index];

          return (
            rightElement !== undefined &&
            element.required === rightElement.required &&
            areEquivalentSchemaNodes(element.type, rightElement.type)
          );
        })
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
        left.fields.every((field, index) => areEquivalentFields(field, right.fields[index]))
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

function areEquivalentFields(
  left: SchemaFieldNode,
  right: SchemaFieldNode | undefined,
): boolean {
  if (right === undefined) {
    return false;
  }

  return (
    left.name.source === right.name.source &&
    left.required === right.required &&
    left.nullable === right.nullable &&
    areEquivalentSchemaNodes(left.type, right.type)
  );
}

function createUnsupportedMixedTypesError(context: string): JsonInferenceError {
  return new JsonInferenceError(
    "unsupported-mixed-types",
    `The input is valid JSON, but ${context} do not share a common inferable type in AST v0.`,
  );
}
