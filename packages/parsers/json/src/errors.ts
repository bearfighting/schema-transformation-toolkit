import type { SchemaDiagnostic } from "@aio/core";

export type JsonInferenceErrorCode = "invalid-json" | "unsupported-mixed-types";

export class JsonInferenceError extends Error {
  readonly code: JsonInferenceErrorCode;
  readonly diagnostics: SchemaDiagnostic[] | undefined;

  constructor(
    code: JsonInferenceErrorCode,
    message: string,
    diagnostics?: SchemaDiagnostic[],
  ) {
    super(message);
    this.code = code;
    this.diagnostics = diagnostics;
    this.name = "JsonInferenceError";
  }
}

export function isJsonInferenceError(
  error: unknown,
): error is JsonInferenceError {
  return error instanceof JsonInferenceError;
}
