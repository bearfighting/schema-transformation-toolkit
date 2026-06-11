import { JsonInferenceError } from "./errors.js";
import type { JsonValue } from "./types.js";

export function decodeJsonText(input: string): JsonValue {
  try {
    return JSON.parse(input) as JsonValue;
  } catch {
    throw new JsonInferenceError(
      "invalid-json",
      "The input is not valid JSON.",
    );
  }
}
