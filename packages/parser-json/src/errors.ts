export type JsonInferenceErrorCode =
  | "invalid-json"
  | "unsupported-mixed-types";

export class JsonInferenceError extends Error {
  readonly code: JsonInferenceErrorCode;

  constructor(code: JsonInferenceErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "JsonInferenceError";
  }
}

export function isJsonInferenceError(
  error: unknown,
): error is JsonInferenceError {
  return error instanceof JsonInferenceError;
}
