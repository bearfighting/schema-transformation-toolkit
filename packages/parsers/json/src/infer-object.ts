import {
  type SchemaDiagnostic,
  schemaFieldNode,
  schemaLiteralNode,
  schemaNullNode,
  schemaObjectNode,
  type SchemaObjectNode,
  schemaRecordNode,
  schemaScalarNode,
  schemaUnionNode,
  type SchemaFieldNode,
  type SchemaNode,
} from "@aio/core";
import type { ResolvedJsonParseOptions } from "./options.js";
import type { JsonObject, JsonValue } from "./types.js";

interface FieldAccumulator {
  samples: number;
  nullSamples: number;
  nonNullValues: JsonValue[];
}

interface ObjectInferenceDependencies {
  emitMixedTypesCollapsedDiagnostic(
    diagnostics: SchemaDiagnostic[],
    path: string[],
    observedKinds?: string[],
  ): void;
  inferFieldType(
    name: string,
    values: JsonValue[],
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

export function mergeObjectSamples(
  values: JsonObject[],
  options: ResolvedJsonParseOptions,
  diagnostics: SchemaDiagnostic[],
  path: string[],
  dependencies: ObjectInferenceDependencies,
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
        dependencies,
      ),
    );

  return schemaObjectNode(fields);
}

export function tryInferRecordNodeFromObjectSamples(
  values: JsonObject[],
  options: ResolvedJsonParseOptions,
  diagnostics: SchemaDiagnostic[],
  path: string[],
  dependencies: Pick<
    ObjectInferenceDependencies,
    | "emitMixedTypesCollapsedDiagnostic"
    | "inferValuesAsSharedType"
    | "isMixedTypesCollapsedUnknownNode"
  >,
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

  const inferredValueType = dependencies.inferValuesAsSharedType(
    allValues,
    "record values",
    options,
    diagnostics,
    path,
  );

  if (dependencies.isMixedTypesCollapsedUnknownNode(inferredValueType)) {
    dependencies.emitMixedTypesCollapsedDiagnostic(
      diagnostics,
      path,
      inferredValueType.evidence?.observedKinds,
    );
  }

  return schemaRecordNode(schemaScalarNode("string"), inferredValueType);
}

export function tryInferDiscriminatedObjectUnion(
  values: JsonObject[],
  options: ResolvedJsonParseOptions,
  diagnostics: SchemaDiagnostic[],
  path: string[],
  dependencies: Pick<ObjectInferenceDependencies, "inferFieldType">,
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
        dependencies,
      ),
    ),
  );
}

function buildMergedField(
  name: string,
  accumulator: FieldAccumulator,
  totalSamples: number,
  options: ResolvedJsonParseOptions,
  diagnostics: SchemaDiagnostic[],
  path: string[],
  dependencies: ObjectInferenceDependencies,
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
    dependencies.inferFieldType(
      name,
      accumulator.nonNullValues,
      options,
      diagnostics,
      path,
    ),
    {
      required,
      nullable,
    },
  );
}

function inferObjectTypeWithLiteralDiscriminators(
  value: JsonObject,
  discriminatorKeys: readonly string[],
  options: ResolvedJsonParseOptions,
  diagnostics: SchemaDiagnostic[],
  path: string[],
  dependencies: Pick<ObjectInferenceDependencies, "inferFieldType">,
): SchemaObjectNode {
  const discriminatorKeySet = new Set(discriminatorKeys);
  const fields = Object.entries(value).map(([name, fieldValue]) =>
    schemaFieldNode(
      name,
      discriminatorKeySet.has(name) &&
        isJsonLiteralDiscriminatorValue(fieldValue)
        ? schemaLiteralNode(fieldValue)
        : dependencies.inferFieldType(
            name,
            [fieldValue],
            options,
            diagnostics,
            path,
          ),
    ),
  );

  return schemaObjectNode(fields);
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
