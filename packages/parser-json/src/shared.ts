import type { JsonObject, JsonValue, ScalarJsonKind } from "./types.js";

export function isJsonObject(value: JsonValue): value is JsonObject {
  return value !== null && !Array.isArray(value) && typeof value === "object";
}

export function isNumericScalar(kind: ScalarJsonKind): boolean {
  return kind === "integer" || kind === "number";
}

export function getFirstValue<T>(values: T[]): T {
  const firstValue = values[0];

  if (firstValue === undefined) {
    throw new Error("Expected a non-empty sample list.");
  }

  return firstValue;
}
