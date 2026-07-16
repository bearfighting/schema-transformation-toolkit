import {
  schemaArrayNode,
  type SchemaDiagnostic,
  type SchemaNode,
  schemaTupleElement,
  schemaTupleNode,
  schemaUnionNode,
} from "@aio/core";
import { isJsonInferenceError } from "./errors.js";
import type { ResolvedJsonParseOptions } from "./options.js";
import type { JsonValue } from "./types.js";

interface ArrayInferenceDependencies {
  emitMixedTypesCollapsedDiagnostic(
    diagnostics: SchemaDiagnostic[],
    path: string[],
    observedKinds?: string[],
  ): void;
  inferSchemaNodeFromJsonValue(
    value: JsonValue,
    options: ResolvedJsonParseOptions,
    diagnostics: SchemaDiagnostic[],
    path: string[],
  ): SchemaNode;
  inferValuesAsSharedType(
    values: JsonValue[],
    context: string,
    options: ResolvedJsonParseOptions,
    diagnostics: SchemaDiagnostic[],
    path: string[],
  ): SchemaNode;
  isMixedTypesCollapsedUnknownNode(
    node: SchemaNode,
  ): node is Extract<SchemaNode, { kind: "unknown" }>;
}

export function inferArrayNodeFromSamples(
  arraySamples: JsonValue[][],
  combinedElements: JsonValue[],
  context: string,
  options: ResolvedJsonParseOptions,
  diagnostics: SchemaDiagnostic[],
  path: string[],
  dependencies: ArrayInferenceDependencies,
): SchemaNode {
  const tupleFallback = () =>
    tryInferTupleNodeFromArraySamples(
      arraySamples,
      options,
      diagnostics,
      path,
      dependencies,
    );

  return inferSharedArrayNode(
    combinedElements,
    context,
    options,
    diagnostics,
    path,
    tupleFallback,
    dependencies,
  );
}

export function inferArrayNodeWithTupleFallback(
  values: JsonValue[],
  context: string,
  options: ResolvedJsonParseOptions,
  diagnostics: SchemaDiagnostic[],
  path: string[],
  dependencies: ArrayInferenceDependencies,
): SchemaNode {
  const tupleFallback = () => {
    if (values.every(Array.isArray)) {
      const inferredTuple = tryInferTupleNodeFromArraySamples(
        values,
        options,
        diagnostics,
        path,
        dependencies,
      );

      if (inferredTuple !== null) {
        return schemaArrayNode(inferredTuple);
      }
    }

    if (shouldInferTupleFromMixedArray(values, options)) {
      return inferTupleNodeFromValues(
        values,
        options,
        diagnostics,
        path,
        dependencies,
      );
    }

    return null;
  };

  return inferSharedArrayNode(
    values,
    context,
    options,
    diagnostics,
    path,
    tupleFallback,
    dependencies,
  );
}

function inferSharedArrayNode(
  elementValues: JsonValue[],
  context: string,
  options: ResolvedJsonParseOptions,
  diagnostics: SchemaDiagnostic[],
  path: string[],
  tupleFallback: () => SchemaNode | null,
  dependencies: ArrayInferenceDependencies,
): SchemaNode {
  try {
    const inferredElementType = dependencies.inferValuesAsSharedType(
      elementValues,
      context,
      options,
      diagnostics,
      path,
    );

    if (dependencies.isMixedTypesCollapsedUnknownNode(inferredElementType)) {
      const inferredTuple = tupleFallback();

      if (inferredTuple !== null) {
        return inferredTuple;
      }

      dependencies.emitMixedTypesCollapsedDiagnostic(
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
      const inferredTuple = tupleFallback();

      if (inferredTuple !== null) {
        return inferredTuple;
      }
    }

    throw error;
  }
}

function inferTupleNodeFromValues(
  values: JsonValue[],
  options: ResolvedJsonParseOptions,
  diagnostics: SchemaDiagnostic[],
  path: string[],
  dependencies: ArrayInferenceDependencies,
): SchemaNode {
  return schemaTupleNode(
    values.map((value) =>
      dependencies.inferSchemaNodeFromJsonValue(value, options, diagnostics, path),
    ),
  );
}

function tryInferTupleNodeFromArraySamples(
  values: JsonValue[][],
  options: ResolvedJsonParseOptions,
  diagnostics: SchemaDiagnostic[],
  path: string[],
  dependencies: ArrayInferenceDependencies,
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
          dependencies,
        ),
        {
          required: positionValues.length === values.length,
        },
      ),
    );
  }

  return schemaTupleNode(elements);
}

function inferValuesAsTuplePositionType(
  values: JsonValue[],
  context: string,
  options: ResolvedJsonParseOptions,
  diagnostics: SchemaDiagnostic[],
  path: string[],
  dependencies: ArrayInferenceDependencies,
): SchemaNode {
  try {
    const inferredType = dependencies.inferValuesAsSharedType(
      values,
      context,
      options,
      diagnostics,
      path,
    );

    if (!dependencies.isMixedTypesCollapsedUnknownNode(inferredType)) {
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
      dependencies.inferSchemaNodeFromJsonValue(value, options, diagnostics, path),
    ),
  );
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
