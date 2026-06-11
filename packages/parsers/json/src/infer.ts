import {
  DEFAULT_JSON_PARSE_OPTIONS,
  type ResolvedJsonParseOptions,
} from "./options.js";
import {
  arrayType,
  fieldNode,
  objectType,
  scalarType,
  unknownType,
  type FieldNode,
  type ObjectTypeNode,
  type TypeNode,
} from "@aio/core";
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
): TypeNode {
  if (typeof value === "string") {
    return scalarType("string");
  }

  if (typeof value === "boolean") {
    return scalarType("boolean");
  }

  if (typeof value === "number") {
    if (options.inference.numericMode === "number-only") {
      return scalarType("number");
    }

    return Number.isInteger(value)
      ? scalarType("integer")
      : scalarType("number");
  }

  if (value === null) {
    return unknownType({
      reason: "top-level-null",
      nullable: true,
    });
  }

  if (Array.isArray(value)) {
    return inferArrayType(value, options);
  }

  return inferObjectType(value, options);
}

function inferArrayType(
  values: JsonValue[],
  options: ResolvedJsonParseOptions,
): TypeNode {
  if (values.length === 0) {
    return arrayType(
      unknownType({
        reason: "empty-array-element",
      }),
    );
  }

  if (values.every(isJsonObject)) {
    return arrayType(mergeObjectSamples(values, options));
  }

  return arrayType(inferValuesAsSharedType(values, "array elements", options));
}

function inferObjectType(
  value: JsonObject,
  options: ResolvedJsonParseOptions,
): ObjectTypeNode {
  const fields = Object.entries(value).map(([name, fieldValue]) =>
    fieldNode(
      name,
      inferFieldType(name, fieldValue === null ? [] : [fieldValue], options),
      {
        nullable: fieldValue === null,
      },
    ),
  );

  return objectType(fields);
}

function mergeObjectSamples(
  values: JsonObject[],
  options: ResolvedJsonParseOptions,
): ObjectTypeNode {
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

  return objectType(fields);
}

function buildMergedField(
  name: string,
  accumulator: FieldAccumulator,
  totalSamples: number,
  options: ResolvedJsonParseOptions,
): FieldNode {
  const required = accumulator.samples === totalSamples;
  const nullable = accumulator.nullSamples > 0;

  return fieldNode(name, inferFieldType(name, accumulator.nonNullValues, options), {
    required,
    nullable,
  });
}

function inferFieldType(
  name: string,
  values: JsonValue[],
  options: ResolvedJsonParseOptions,
): TypeNode {
  if (values.length === 0) {
    return unknownType({
      reason: "null-only-field",
    });
  }

  if (values.every(isJsonObject)) {
    if (values.length === 1) {
      return inferObjectType(getFirstValue(values), options);
    }

    return mergeObjectSamples(values, options);
  }

  if (values.every(Array.isArray)) {
    if (values.length === 1) {
      return inferJsonType(getFirstValue(values), options);
    }

    const combinedElements = values.flat();

    if (combinedElements.length === 0) {
      return arrayType(
        unknownType({
          reason: "empty-array-only-field",
        }),
      );
    }

    return arrayType(
      inferValuesAsSharedType(
        combinedElements,
        `field "${name}" array elements`,
        options,
      ),
    );
  }

  return inferValuesAsSharedType(values, `field "${name}"`, options);
}

function inferValuesAsSharedType(
  values: JsonValue[],
  context: string,
  options: ResolvedJsonParseOptions,
): TypeNode {
  const inferredType = inferJsonType(getFirstValue(values), options);

  for (const value of values.slice(1)) {
    const nextType = inferJsonType(value, options);
    mergeTypeNodes(inferredType, nextType, context);
  }

  return inferredType;
}
