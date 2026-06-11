import {
  DEFAULT_JSON_PARSE_OPTIONS,
  type ResolvedJsonParseOptions,
} from "./options.js";
import {
  schemaArrayNode,
  schemaFieldNode,
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
import { isJsonInferenceError } from "./errors.js";
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
    return inferArrayType(value, options);
  }

  return inferObjectType(value, options);
}

function inferArrayType(
  values: JsonValue[],
  options: ResolvedJsonParseOptions,
): SchemaNode {
  if (values.length === 0) {
    return schemaArrayNode(
      schemaUnknownNode({
        reason: "empty-array-element",
      }),
    );
  }

  if (values.every(isJsonObject)) {
    const inferredRecord = tryInferRecordNodeFromObjectSamples(values, options);

    if (inferredRecord !== null) {
      return schemaArrayNode(inferredRecord);
    }

    return schemaArrayNode(mergeObjectSamples(values, options));
  }

  try {
    return schemaArrayNode(
      inferValuesAsSharedType(values, "array elements", options),
    );
  } catch (error) {
    if (isJsonInferenceError(error) && error.code === "unsupported-mixed-types") {
      if (values.every(Array.isArray)) {
        const inferredTuple = tryInferTupleNodeFromArraySamples(values, options);

        if (inferredTuple !== null) {
          return schemaArrayNode(inferredTuple);
        }
      }

      if (shouldInferTupleFromMixedArray(values, options)) {
        return inferTupleNodeFromValues(values, options);
      }
    }

    throw error;
  }
}

function inferObjectType(
  value: JsonObject,
  options: ResolvedJsonParseOptions,
): SchemaObjectNode {
  const fields = Object.entries(value).map(([name, fieldValue]) =>
    schemaFieldNode(
      name,
      inferFieldType(name, [fieldValue], options),
    ),
  );

  return schemaObjectNode(fields);
}

function mergeObjectSamples(
  values: JsonObject[],
  options: ResolvedJsonParseOptions,
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
      buildMergedField(name, accumulator, values.length, options),
    );

  return schemaObjectNode(fields);
}

function buildMergedField(
  name: string,
  accumulator: FieldAccumulator,
  totalSamples: number,
  options: ResolvedJsonParseOptions,
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
    inferFieldType(name, accumulator.nonNullValues, options),
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
): SchemaNode {
  if (values.every((value) => value === null)) {
    return schemaNullNode();
  }

  if (values.every(isJsonObject)) {
    if (values.length === 1) {
      return inferObjectType(getFirstValue(values), options);
    }

    const inferredRecord = tryInferRecordNodeFromObjectSamples(values, options);

    if (inferredRecord !== null) {
      return inferredRecord;
    }

    return mergeObjectSamples(values, options);
  }

  if (values.every(Array.isArray)) {
    if (values.length === 1) {
      return inferSchemaNodeFromJsonValue(getFirstValue(values), options);
    }

    const combinedElements = values.flat();

    if (combinedElements.length === 0) {
      return schemaArrayNode(
        schemaUnknownNode({
          reason: "empty-array-only-field",
        }),
      );
    }

    try {
      return schemaArrayNode(
        inferValuesAsSharedType(
          combinedElements,
          `field "${name}" array elements`,
          options,
        ),
      );
    } catch (error) {
      const inferredTuple = tryInferTupleNodeFromArraySamples(values, options);

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

  return inferValuesAsSharedType(values, `field "${name}"`, options);
}

function inferTupleNodeFromValues(
  values: JsonValue[],
  options: ResolvedJsonParseOptions,
): SchemaNode {
  return schemaTupleNode(
    values.map((value) => inferSchemaNodeFromJsonValue(value, options)),
  );
}

function tryInferTupleNodeFromArraySamples(
  values: JsonValue[][],
  options: ResolvedJsonParseOptions,
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

  return schemaRecordNode(
    schemaScalarNode("string"),
    inferValuesAsSharedType(allValues, "record values", options),
  );
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
    values.length > 0 && options.schema.tupleInferenceMode === "heterogeneous-only"
  );
}

function inferValuesAsSharedType(
  values: JsonValue[],
  context: string,
  options: ResolvedJsonParseOptions,
): SchemaNode {
  let inferredType = inferSchemaNodeFromJsonValue(getFirstValue(values), options);

  for (const value of values.slice(1)) {
    const nextType = inferSchemaNodeFromJsonValue(value, options);
    inferredType = mergeTypeNodes(
      inferredType,
      nextType,
      context,
      options.schema.mixedTypeMode,
    );
  }

  return inferredType;
}

function inferValuesAsTuplePositionType(
  values: JsonValue[],
  context: string,
  options: ResolvedJsonParseOptions,
): SchemaNode {
  try {
    return inferValuesAsSharedType(values, context, options);
  } catch (error) {
    if (!isJsonInferenceError(error) || error.code !== "unsupported-mixed-types") {
      throw error;
    }

    return schemaUnionNode(
      values.map((value) => inferSchemaNodeFromJsonValue(value, options)),
    );
  }
}
