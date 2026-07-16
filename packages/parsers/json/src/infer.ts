import {
  DEFAULT_JSON_PARSE_OPTIONS,
  type ResolvedJsonParseOptions,
} from "./options.js";
import {
  schemaArrayNode,
  type SchemaDiagnostic,
  schemaFieldNode,
  schemaNullNode,
  schemaObjectNode,
  schemaScalarNode,
  schemaUnknownNode,
  type SchemaNode,
  type SchemaObjectNode,
} from "@aio/core";
import {
  inferArrayNodeFromSamples,
  inferArrayNodeWithTupleFallback,
} from "./infer-array.js";
import {
  mergeObjectSamples,
  tryInferDiscriminatedObjectUnion,
  tryInferRecordNodeFromObjectSamples,
} from "./infer-object.js";
import {
  emitMixedTypesCollapsedDiagnostic,
  inferValuesAsSharedType as inferSharedTypeAcrossValues,
  isMixedTypesCollapsedUnknownNode,
} from "./infer-shared.js";
import { getFirstValue, isJsonObject } from "./shared.js";
import type { JsonObject, JsonValue } from "./types.js";

export function inferJsonType(
  value: JsonValue,
  options: ResolvedJsonParseOptions = DEFAULT_JSON_PARSE_OPTIONS,
): SchemaNode {
  return inferSchemaNodeFromJsonValue(value, options);
}

export function inferSchemaNodeFromJsonValue(
  value: JsonValue,
  options: ResolvedJsonParseOptions = DEFAULT_JSON_PARSE_OPTIONS,
  diagnostics: SchemaDiagnostic[] = [],
  path: string[] = [],
): SchemaNode {
  if (typeof value === "string") {
    return schemaScalarNode("string");
  }

  if (typeof value === "boolean") {
    return schemaScalarNode("boolean");
  }

  if (typeof value === "number") {
    if (options.schema.numericMode === "number-only") {
      return schemaScalarNode("number");
    }

    return Number.isInteger(value)
      ? schemaScalarNode("integer")
      : schemaScalarNode("number");
  }

  if (value === null) {
    return schemaNullNode();
  }

  if (Array.isArray(value)) {
    return inferArrayType(value, options, diagnostics, path);
  }

  return inferObjectType(value, options, diagnostics, path);
}

function inferArrayType(
  values: JsonValue[],
  options: ResolvedJsonParseOptions,
  diagnostics: SchemaDiagnostic[],
  path: string[],
): SchemaNode {
  if (values.length === 0) {
    diagnostics.push({
      severity: "info",
      code: "empty-array-element",
      message:
        "The parser inferred an unknown array element type because the array was empty.",
      path,
      nodeKind: "unknown",
      source: "parser-json",
    });
    return schemaArrayNode(
      schemaUnknownNode({
        reason: "empty-array-element",
        evidence: {
          source: "parser-json",
        },
      }),
    );
  }

  if (values.every(isJsonObject)) {
    return schemaArrayNode(
      inferObjectNodeFromSamples(values, options, diagnostics, path),
    );
  }

  return inferArrayNodeWithTupleFallback(
    values,
    "array elements",
    options,
    diagnostics,
    path,
    arrayInferenceDependencies,
  );
}

function inferObjectType(
  value: JsonObject,
  options: ResolvedJsonParseOptions,
  diagnostics: SchemaDiagnostic[],
  path: string[],
): SchemaObjectNode {
  const fields = Object.entries(value).map(([name, fieldValue]) =>
    schemaFieldNode(
      name,
      inferFieldType(name, [fieldValue], options, diagnostics, path),
    ),
  );

  return schemaObjectNode(fields);
}

function inferFieldType(
  name: string,
  values: JsonValue[],
  options: ResolvedJsonParseOptions,
  diagnostics: SchemaDiagnostic[],
  path: string[],
): SchemaNode {
  const fieldPath = [...path, name];

  if (values.every((value) => value === null)) {
    return schemaNullNode();
  }

  if (values.every(isJsonObject)) {
    return inferObjectNodeFromSamples(values, options, diagnostics, fieldPath);
  }

  if (values.every(Array.isArray)) {
    return inferFieldArrayType(name, values, options, diagnostics, fieldPath);
  }

  const inferredType = inferSharedTypeAcrossValues(
    values,
    `field "${name}"`,
    options,
    diagnostics,
    fieldPath,
    sharedInferenceDependencies,
  );

  if (isMixedTypesCollapsedUnknownNode(inferredType)) {
    emitMixedTypesCollapsedDiagnostic(
      diagnostics,
      fieldPath,
      inferredType.evidence?.observedKinds,
    );
  }

  return inferredType;
}

function inferObjectNodeFromSamples(
  values: JsonObject[],
  options: ResolvedJsonParseOptions,
  diagnostics: SchemaDiagnostic[],
  path: string[],
): SchemaNode {
  if (values.length === 1) {
    return inferObjectType(getFirstValue(values), options, diagnostics, path);
  }

  const inferredRecord = tryInferRecordNodeFromObjectSamples(
    values,
    options,
    diagnostics,
    path,
    objectInferenceDependencies,
  );

  if (inferredRecord !== null) {
    return inferredRecord;
  }

  const discriminatedUnion = tryInferDiscriminatedObjectUnion(
    values,
    options,
    diagnostics,
    path,
    objectInferenceDependencies,
  );

  if (discriminatedUnion !== null) {
    return discriminatedUnion;
  }

  return mergeObjectSamples(
    values,
    options,
    diagnostics,
    path,
    objectInferenceDependencies,
  );
}

function inferFieldArrayType(
  name: string,
  values: JsonValue[][],
  options: ResolvedJsonParseOptions,
  diagnostics: SchemaDiagnostic[],
  fieldPath: string[],
): SchemaNode {
  if (values.length === 1) {
    return inferSchemaNodeFromJsonValue(
      getFirstValue(values),
      options,
      diagnostics,
      fieldPath,
    );
  }

  const combinedElements = values.flat();

  if (combinedElements.length === 0) {
    diagnostics.push({
      severity: "info",
      code: "empty-array-only-field",
      message: `The parser inferred an unknown array element type for field "${name}" because only empty arrays were observed.`,
      path: fieldPath,
      nodeKind: "unknown",
      source: "parser-json",
    });
    return schemaArrayNode(
      schemaUnknownNode({
        reason: "empty-array-only-field",
        evidence: {
          source: "parser-json",
        },
      }),
    );
  }

  return inferArrayNodeFromSamples(
    values,
    combinedElements,
    `field "${name}" array elements`,
    options,
    diagnostics,
    fieldPath,
    arrayInferenceDependencies,
  );
}

const arrayInferenceDependencies = {
  emitMixedTypesCollapsedDiagnostic,
  inferSchemaNodeFromJsonValue,
  inferValuesAsSharedType(
    values: JsonValue[],
    context: string,
    options: ResolvedJsonParseOptions,
    diagnostics: SchemaDiagnostic[],
    path: string[],
  ) {
    return inferSharedTypeAcrossValues(
      values,
      context,
      options,
      diagnostics,
      path,
      sharedInferenceDependencies,
    );
  },
  isMixedTypesCollapsedUnknownNode,
};

const objectInferenceDependencies = {
  emitMixedTypesCollapsedDiagnostic,
  inferFieldType,
  inferValuesAsSharedType(
    values: JsonValue[],
    context: string,
    options: ResolvedJsonParseOptions,
    diagnostics: SchemaDiagnostic[],
    path: string[],
  ) {
    return inferSharedTypeAcrossValues(
      values,
      context,
      options,
      diagnostics,
      path,
      sharedInferenceDependencies,
    );
  },
  isMixedTypesCollapsedUnknownNode,
};

const sharedInferenceDependencies = {
  inferSchemaNodeFromJsonValue,
};
