import type {
  SchemaDiagnostic,
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
  diagnostics: SchemaDiagnostic[] = [],
  path: string[] = [],
): SchemaNode {
  if (left.kind !== right.kind) {
    if (mixedTypeMode === "union") {
      return mergeAsUnion(left, right);
    }

    throw new JsonInferenceError(
      "unsupported-mixed-types",
      `The input is valid JSON, but ${context} do not share a common inferable type in schema IR v0.`,
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
    return mergeTupleTypeNodes(
      left,
      right,
      context,
      mixedTypeMode,
      diagnostics,
      path,
    );
  }

  if (left.kind === "record" && right.kind === "record") {
    return mergeRecordTypeNodes(
      left,
      right,
      context,
      mixedTypeMode,
      diagnostics,
      path,
    );
  }

  if (left.kind === "union" || right.kind === "union") {
    return mergeAsUnion(left, right);
  }

  if (left.kind === "array" && right.kind === "array") {
    return {
      ...left,
      elementType: mergeTypeNodes(
        left.elementType,
        right.elementType,
        context,
        mixedTypeMode,
        diagnostics,
        path,
      ),
    };
  }

  if (left.kind === "object" && right.kind === "object") {
    return mergeObjectTypeNodes(
      left,
      right,
      context,
      mixedTypeMode,
      diagnostics,
      path,
    );
  }

  throw new JsonInferenceError(
    "unsupported-mixed-types",
    `The input is valid JSON, but ${context} do not share a common inferable type in schema IR v0.`,
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
    return {
      ...left,
      scalar: "number",
    };
  }

  if (mixedTypeMode === "union") {
    return mergeAsUnion(left, right);
  }

  throw new JsonInferenceError(
    "unsupported-mixed-types",
    `The input is valid JSON, but ${context} do not share a common inferable type in schema IR v0.`,
  );
}

function mergeObjectTypeNodes(
  left: SchemaObjectNode,
  right: SchemaObjectNode,
  context: string,
  mixedTypeMode: JsonMixedTypeMode,
  diagnostics: SchemaDiagnostic[],
  path: string[],
): SchemaObjectNode {
  const fieldMap = new Map<string, SchemaFieldNode>();

  for (const field of left.fields) {
    fieldMap.set(field.name.source, { ...field });
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
      diagnostics,
      [...path, leftField.name.source],
    );
    leftField.nullable = leftField.nullable || rightField.nullable;
  }

  for (const leftField of left.fields) {
    if (
      !right.fields.some((field) => field.name.source === leftField.name.source)
    ) {
      const mergedField = fieldMap.get(leftField.name.source);

      if (mergedField) {
        mergedField.required = false;
      }
    }
  }

  return {
    ...left,
    fields: Array.from(fieldMap.values()).sort((leftField, rightField) =>
      leftField.name.source.localeCompare(rightField.name.source),
    ),
  };
}

function mergeUnknownTypeNodes(
  left: SchemaUnknownNode,
  right: SchemaUnknownNode,
): SchemaUnknownNode {
  // Unknown-reason retention is intentionally left-biased for now; merging only
  // widens nullability unless the unknown-node model is expanded later.
  return {
    ...left,
    nullable: left.nullable || right.nullable,
  };
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
  diagnostics: SchemaDiagnostic[],
  path: string[],
): SchemaNode {
  const maxLength = Math.max(left.elements.length, right.elements.length);

  const elements = Array.from({ length: maxLength }, (_, index) => {
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
          diagnostics,
          [...path, String(index)],
        ),
      };
    } catch (error) {
      if (
        error instanceof JsonInferenceError &&
        error.code === "unsupported-mixed-types"
      ) {
        diagnostics.push({
          severity: "info",
          code: "preserved-tuple-position-union",
          message:
            "The parser preserved a tuple-position union because observed values at this position did not share one common type.",
          path: [...path, String(index)],
          nodeKind: "union",
          source: "parser-json",
        });
        return {
          required: element.required && rightElement.required,
          type: mergeAsUnion(element.type, rightElement.type),
        };
      }

      throw error;
    }
  });

  return {
    ...left,
    elements,
  };
}

function mergeRecordTypeNodes(
  left: SchemaRecordNode,
  right: SchemaRecordNode,
  context: string,
  mixedTypeMode: JsonMixedTypeMode,
  diagnostics: SchemaDiagnostic[],
  path: string[],
): SchemaRecordNode {
  return {
    ...left,
    key: mergeTypeNodes(
      left.key,
      right.key,
      `${context} record keys`,
      mixedTypeMode,
      diagnostics,
      path,
    ),
    value: mergeTypeNodes(
      left.value,
      right.value,
      `${context} record values`,
      mixedTypeMode,
      diagnostics,
      path,
    ),
  };
}

function mergeAsUnion(left: SchemaNode, right: SchemaNode): SchemaUnionNode {
  return schemaUnionNode([left, right]);
}

function createUnsupportedMixedTypesError(context: string): JsonInferenceError {
  return new JsonInferenceError(
    "unsupported-mixed-types",
    `The input is valid JSON, but ${context} do not share a common inferable type in schema IR v0.`,
  );
}
