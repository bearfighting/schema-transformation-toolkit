export type JsonInferenceErrorCode =
  | "invalid-json"
  | "unsupported-top-level-null"
  | "unsupported-empty-array"
  | "unsupported-null-only-field"
  | "unsupported-empty-array-only-field"
  | "unsupported-mixed-types";

export class JsonInferenceError extends Error {
  readonly code: JsonInferenceErrorCode;

  constructor(code: JsonInferenceErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "JsonInferenceError";
  }
}

export function isJsonInferenceError(error: unknown): error is JsonInferenceError {
  return error instanceof JsonInferenceError;
}
