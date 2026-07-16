import { JsonSchemaInferenceError } from "./errors.js";

export function decodeJsonSchemaText(input: string): unknown {
  try {
    return JSON.parse(input) as unknown;
  } catch {
    throw new JsonSchemaInferenceError(
      "invalid-json-schema-json",
      "The input is not valid JSON.",
    );
  }
}
