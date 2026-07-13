import {
  DEFAULT_JSON_PARSE_OPTIONS,
  type ResolvedJsonParseOptions,
} from "./options.js";
import {
  schemaArrayNode,
  type SchemaDiagnostic,
  schemaFieldNode,
  schemaLiteralNode,
  schemaNullNode,
  schemaObjectNode,
  schemaRecordNode,
  schemaScalarNode,
  schemaTupleElement,
  schemaTupleNode,
  schemaUnionNode,
  schemaUnknownNode,
  type SchemaFieldNode,
  type SchemaNode,
  type SchemaObjectNode,
} from "@aio/core";
import { JsonInferenceError, isJsonInferenceError } from "./errors.js";
import { mergeTypeNodes } from "./merge.js";
import { getFirstValue, isJsonObject } from "./shared.js";
import type { JsonObject, JsonValue } from "./types.js";

interface FieldAccumulator {
  samples: number;
  nullSamples: number;
  nonNullValues: JsonValue[];
}

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
    const inferredRecord = tryInferRecordNodeFromObjectSamples(
      values,
      options,
      diagnostics,
      path,
    );

    if (inferredRecord !== null) {
      return schemaArrayNode(inferredRecord);
    }

    const discriminatedUnion = tryInferDiscriminatedObjectUnion(
      values,
      options,
      diagnostics,
      path,
    );

    if (discriminatedUnion !== null) {
      return schemaArrayNode(discriminatedUnion);
    }

    return schemaArrayNode(
      mergeObjectSamples(values, options, diagnostics, path),
    );
  }

  try {
    const inferredElementType = inferValuesAsSharedType(
      values,
      "array elements",
      options,
      diagnostics,
      path,
    );

    if (isMixedTypesCollapsedUnknownNode(inferredElementType)) {
      if (values.every(Array.isArray)) {
        const inferredTuple = tryInferTupleNodeFromArraySamples(
          values,
          options,
          diagnostics,
          path,
        );

        if (inferredTuple !== null) {
          return schemaArrayNode(inferredTuple);
        }
      }

      if (shouldInferTupleFromMixedArray(values, options)) {
        return inferTupleNodeFromValues(values, options, diagnostics, path);
      }

      emitMixedTypesCollapsedDiagnostic(
        diagnostics,
        path,
        inferredElementType.evidence?.observedKinds,
      );
    }

    return schemaArrayNode(inferredElementType);
  } catch (error) {
    if (
      isJsonInferenceError(error) &&
      error.code === "unsupported-mixed-types"
    ) {
      if (values.every(Array.isArray)) {
        const inferredTuple = tryInferTupleNodeFromArraySamples(
          values,
          options,
          diagnostics,
          path,
        );

        if (inferredTuple !== null) {
          return schemaArrayNode(inferredTuple);
        }
      }

      if (shouldInferTupleFromMixedArray(values, options)) {
        return inferTupleNodeFromValues(values, options, diagnostics, path);
      }
    }

    throw error;
  }
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

function mergeObjectSamples(
  values: JsonObject[],
  options: ResolvedJsonParseOptions,
  diagnostics: SchemaDiagnostic[],
  path: string[],
): SchemaObjectNode {
  const accumulators = new Map<string, FieldAccumulator>();

  for (const sample of values) {
    for (const [name, value] of Object.entries(sample)) {
      const existing = accumulators.get(name);

      if (existing) {
        existing.samples += 1;
        if (value === null) {
          existing.nullSamples += 1;
        } else {
          existing.nonNullValues.push(value);
        }
        continue;
      }

      accumulators.set(name, {
        samples: 1,
        nullSamples: value === null ? 1 : 0,
        nonNullValues: value === null ? [] : [value],
      });
    }
  }

  const fields = Array.from(accumulators.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, accumulator]) =>
      buildMergedField(
        name,
        accumulator,
        values.length,
        options,
        diagnostics,
        path,
      ),
    );

  return schemaObjectNode(fields);
}

function buildMergedField(
  name: string,
  accumulator: FieldAccumulator,
  totalSamples: number,
  options: ResolvedJsonParseOptions,
  diagnostics: SchemaDiagnostic[],
  path: string[],
): SchemaFieldNode {
  const required = accumulator.samples === totalSamples;
  const nullable =
    accumulator.nullSamples > 0 && accumulator.nonNullValues.length > 0;

  if (accumulator.nullSamples > 0 && accumulator.nonNullValues.length === 0) {
    return schemaFieldNode(name, schemaNullNode(), {
      required,
    });
  }

  return schemaFieldNode(
    name,
    inferFieldType(name, accumulator.nonNullValues, options, diagnostics, path),
    {
      required,
      nullable,
    },
  );
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
    if (values.length === 1) {
      return inferObjectType(
        getFirstValue(values),
        options,
        diagnostics,
        fieldPath,
      );
    }

    const inferredRecord = tryInferRecordNodeFromObjectSamples(
      values,
      options,
      diagnostics,
      fieldPath,
    );

    if (inferredRecord !== null) {
      return inferredRecord;
    }

    const discriminatedUnion = tryInferDiscriminatedObjectUnion(
      values,
      options,
      diagnostics,
      fieldPath,
    );

    if (discriminatedUnion !== null) {
      return discriminatedUnion;
    }

    return mergeObjectSamples(values, options, diagnostics, fieldPath);
  }

  if (values.every(Array.isArray)) {
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

    try {
      const inferredElementType = inferValuesAsSharedType(
        combinedElements,
        `field "${name}" array elements`,
        options,
        diagnostics,
        fieldPath,
      );

      if (isMixedTypesCollapsedUnknownNode(inferredElementType)) {
        const inferredTuple = tryInferTupleNodeFromArraySamples(
          values,
          options,
          diagnostics,
          fieldPath,
        );

        if (inferredTuple !== null) {
          return inferredTuple;
        }

        emitMixedTypesCollapsedDiagnostic(
          diagnostics,
          fieldPath,
          inferredElementType.evidence?.observedKinds,
        );
      }

      return schemaArrayNode(inferredElementType);
    } catch (error) {
      const inferredTuple = tryInferTupleNodeFromArraySamples(
        values,
        options,
        diagnostics,
        fieldPath,
      );

      if (
        inferredTuple !== null &&
        isJsonInferenceError(error) &&
        error.code === "unsupported-mixed-types"
      ) {
        return inferredTuple;
      }

      throw error;
    }
  }

  const inferredType = inferValuesAsSharedType(
    values,
    `field "${name}"`,
    options,
    diagnostics,
    fieldPath,
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

function inferTupleNodeFromValues(
  values: JsonValue[],
  options: ResolvedJsonParseOptions,
  diagnostics: SchemaDiagnostic[],
  path: string[],
): SchemaNode {
  return schemaTupleNode(
    values.map((value) =>
      inferSchemaNodeFromJsonValue(value, options, diagnostics, path),
    ),
  );
}

function tryInferTupleNodeFromArraySamples(
  values: JsonValue[][],
  options: ResolvedJsonParseOptions,
  diagnostics: SchemaDiagnostic[],
  path: string[],
): SchemaNode | null {
  if (options.schema.tupleInferenceMode !== "heterogeneous-only") {
    return null;
  }

  const tupleLength = Math.max(...values.map((value) => value.length), 0);

  if (tupleLength === 0) {
    return null;
  }
  const elements = [];

  for (let index = 0; index < tupleLength; index += 1) {
    const positionValues = values
      .map((value) => value[index])
      .filter((value): value is JsonValue => value !== undefined);

    if (positionValues.length === 0) {
      continue;
    }

    elements.push(
      schemaTupleElement(
        inferValuesAsTuplePositionType(
          positionValues,
          `tuple index ${index}`,
          options,
          diagnostics,
          [...path, String(index)],
        ),
        {
          required: positionValues.length === values.length,
        },
      ),
    );
  }

  return schemaTupleNode(elements);
}

function tryInferRecordNodeFromObjectSamples(
  values: JsonObject[],
  options: ResolvedJsonParseOptions,
  diagnostics: SchemaDiagnostic[],
  path: string[],
): SchemaNode | null {
  if (options.schema.recordInferenceMode !== "shared-value-type") {
    return null;
  }

  if (values.length < 2) {
    return null;
  }

  const commonKeys = getCommonObjectKeys(values);

  if (commonKeys.size > 0) {
    return null;
  }

  const allValues = values.flatMap((value) => Object.values(value));

  if (allValues.length === 0) {
    return null;
  }

  const inferredValueType = inferValuesAsSharedType(
    allValues,
    "record values",
    options,
    diagnostics,
    path,
  );

  if (isMixedTypesCollapsedUnknownNode(inferredValueType)) {
    emitMixedTypesCollapsedDiagnostic(
      diagnostics,
      path,
      inferredValueType.evidence?.observedKinds,
    );
  }

  return schemaRecordNode(schemaScalarNode("string"), inferredValueType);
}

function getCommonObjectKeys(values: JsonObject[]): Set<string> {
  const firstSample = values[0];

  if (firstSample === undefined) {
    return new Set<string>();
  }

  const commonKeys = new Set(Object.keys(firstSample));

  for (const sample of values.slice(1)) {
    for (const key of Array.from(commonKeys)) {
      if (!(key in sample)) {
        commonKeys.delete(key);
      }
    }
  }

  return commonKeys;
}

function shouldInferTupleFromMixedArray(
  values: JsonValue[],
  options: ResolvedJsonParseOptions,
): boolean {
  return (
    values.length > 0 &&
    options.schema.tupleInferenceMode === "heterogeneous-only"
  );
}

function tryInferDiscriminatedObjectUnion(
  values: JsonObject[],
  options: ResolvedJsonParseOptions,
  diagnostics: SchemaDiagnostic[],
  path: string[],
): SchemaNode | null {
  if (options.schema.mixedTypeMode !== "union" || values.length < 2) {
    return null;
  }

  const discriminatorKeys = getLiteralDiscriminatorKeys(values);

  if (discriminatorKeys.length === 0) {
    return null;
  }

  diagnostics.push({
    severity: "info",
    code: "preserved-discriminated-object-union",
    message:
      "The parser preserved object union structure because shared literal discriminator fields were detected.",
    path,
    nodeKind: "union",
    source: "parser-json",
    evidence: {
      discriminatorKeys,
    },
  });

  return schemaUnionNode(
    values.map((value) =>
      inferObjectTypeWithLiteralDiscriminators(
        value,
        discriminatorKeys,
        options,
        diagnostics,
        path,
      ),
    ),
  );
}

function inferObjectTypeWithLiteralDiscriminators(
  value: JsonObject,
  discriminatorKeys: readonly string[],
  options: ResolvedJsonParseOptions,
  diagnostics: SchemaDiagnostic[],
  path: string[],
): SchemaObjectNode {
  const discriminatorKeySet = new Set(discriminatorKeys);
  const fields = Object.entries(value).map(([name, fieldValue]) =>
    schemaFieldNode(
      name,
      discriminatorKeySet.has(name) &&
        isJsonLiteralDiscriminatorValue(fieldValue)
        ? schemaLiteralNode(fieldValue)
        : inferFieldType(name, [fieldValue], options, diagnostics, path),
    ),
  );

  return schemaObjectNode(fields);
}

function getLiteralDiscriminatorKeys(values: JsonObject[]): string[] {
  const commonKeys = getCommonObjectKeys(values);
  const discriminatorKeys: string[] = [];

  for (const key of commonKeys) {
    const discriminatorValues = values.map((value) => value[key]);

    if (
      discriminatorValues.every(isJsonStringDiscriminatorValue) &&
      new Set(discriminatorValues).size > 1
    ) {
      discriminatorKeys.push(key);
    }
  }

  return discriminatorKeys.sort((left, right) => left.localeCompare(right));
}

function isJsonLiteralDiscriminatorValue(
  value: JsonValue,
): value is string | number | boolean {
  return (
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

function isJsonStringDiscriminatorValue(
  value: JsonValue | undefined,
): value is string {
  return typeof value === "string";
}

function inferValuesAsSharedType(
  values: JsonValue[],
  context: string,
  options: ResolvedJsonParseOptions,
  diagnostics: SchemaDiagnostic[],
  path: string[],
): SchemaNode {
  let inferredType = inferSchemaNodeFromJsonValue(
    getFirstValue(values),
    options,
    diagnostics,
    path,
  );

  for (const value of values.slice(1)) {
    const nextType = inferSchemaNodeFromJsonValue(
      value,
      options,
      diagnostics,
      path,
    );

    try {
      inferredType = mergeTypeNodes(
        inferredType,
        nextType,
        context,
        options.schema.mixedTypeMode,
        diagnostics,
        path,
      );
    } catch (error) {
      if (
        isJsonInferenceError(error) &&
        error.code === "unsupported-mixed-types"
      ) {
        if (options.schema.mixedTypeMode === "unknown") {
          return schemaUnknownNode({
            reason: "mixed-types-collapsed",
            evidence: {
              source: "parser-json",
              observedKinds: getObservedJsonKinds(values, options),
            },
          });
        }

        if (error.diagnostics && error.diagnostics.length > 0) {
          throw error;
        }

        throw new JsonInferenceError(error.code, error.message, [
          {
            severity: "error",
            code: error.code,
            message: error.message,
            path,
            source: "parser-json",
          },
        ]);
      }

      throw error;
    }
  }

  return inferredType;
}

function inferValuesAsTuplePositionType(
  values: JsonValue[],
  context: string,
  options: ResolvedJsonParseOptions,
  diagnostics: SchemaDiagnostic[],
  path: string[],
): SchemaNode {
  try {
    const inferredType = inferValuesAsSharedType(
      values,
      context,
      options,
      diagnostics,
      path,
    );

    if (!isMixedTypesCollapsedUnknownNode(inferredType)) {
      return inferredType;
    }
  } catch (error) {
    if (
      !isJsonInferenceError(error) ||
      error.code !== "unsupported-mixed-types"
    ) {
      throw error;
    }
  }

  diagnostics.push({
    severity: "info",
    code: "preserved-tuple-position-union",
    message:
      "The parser preserved a tuple-position union because observed values at this position did not share one common type.",
    path,
    nodeKind: "union",
    source: "parser-json",
  });

  return schemaUnionNode(
    values.map((value) =>
      inferSchemaNodeFromJsonValue(value, options, diagnostics, path),
    ),
  );
}

function isMixedTypesCollapsedUnknownNode(
  node: SchemaNode,
): node is Extract<SchemaNode, { kind: "unknown" }> {
  return node.kind === "unknown" && node.reason === "mixed-types-collapsed";
}

function emitMixedTypesCollapsedDiagnostic(
  diagnostics: SchemaDiagnostic[],
  path: string[],
  observedKinds?: string[],
): void {
  diagnostics.push({
    severity: "info",
    code: "collapsed-mixed-types-to-unknown",
    message:
      'The parser collapsed mixed incompatible samples to unknown because mixedTypeMode was set to "unknown".',
    path,
    nodeKind: "unknown",
    source: "parser-json",
    ...(observedKinds && observedKinds.length > 0
      ? {
          evidence: {
            observedKinds,
          },
        }
      : {}),
  });
}

function getObservedJsonKinds(
  values: JsonValue[],
  options: ResolvedJsonParseOptions,
): string[] {
  return Array.from(
    new Set(
      values.map((value) => {
        if (value === null) {
          return "null";
        }

        if (Array.isArray(value)) {
          return "array";
        }

        if (typeof value === "object") {
          return "object";
        }

        if (typeof value === "number") {
          if (options.schema.numericMode === "number-only") {
            return "number";
          }

          return Number.isInteger(value) ? "integer" : "number";
        }

        return typeof value;
      }),
    ),
  ).sort((left, right) => left.localeCompare(right));
}
