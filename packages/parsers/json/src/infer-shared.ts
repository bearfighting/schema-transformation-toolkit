import {
  type SchemaDiagnostic,
  type SchemaNode,
  schemaUnknownNode,
} from "@aio/core";
import { JsonInferenceError, isJsonInferenceError } from "./errors.js";
import { mergeTypeNodes } from "./merge.js";
import type { ResolvedJsonParseOptions } from "./options.js";
import { getFirstValue } from "./shared.js";
import type { JsonValue } from "./types.js";

interface SharedInferenceDependencies {
  inferSchemaNodeFromJsonValue(
    value: JsonValue,
    options: ResolvedJsonParseOptions,
    diagnostics: SchemaDiagnostic[],
    path: string[],
  ): SchemaNode;
}

export function inferValuesAsSharedType(
  values: JsonValue[],
  context: string,
  options: ResolvedJsonParseOptions,
  diagnostics: SchemaDiagnostic[],
  path: string[],
  dependencies: SharedInferenceDependencies,
): SchemaNode {
  let inferredType = dependencies.inferSchemaNodeFromJsonValue(
    getFirstValue(values),
    options,
    diagnostics,
    path,
  );

  for (const value of values.slice(1)) {
    const nextType = dependencies.inferSchemaNodeFromJsonValue(
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

export function isMixedTypesCollapsedUnknownNode(
  node: SchemaNode,
): node is Extract<SchemaNode, { kind: "unknown" }> {
  return node.kind === "unknown" && node.reason === "mixed-types-collapsed";
}

export function emitMixedTypesCollapsedDiagnostic(
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
