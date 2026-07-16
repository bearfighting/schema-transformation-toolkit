import type { SchemaDiagnostic } from "@aio/core";

export type JsonSchemaInferenceErrorCode =
  | "invalid-json-schema-json"
  | "unsupported-json-schema-draft"
  | "unsupported-json-schema-ref"
  | "unsupported-json-schema-keyword"
  | "unsupported-json-schema-boolean-false"
  | "unsupported-json-schema-closed-object"
  | "unsupported-json-schema-mixed-object-shape"
  | "unsupported-json-schema-type-array"
  | "invalid-json-schema-shape";

export class JsonSchemaInferenceError extends Error {
  readonly code: JsonSchemaInferenceErrorCode;
  readonly diagnostics: SchemaDiagnostic[] | undefined;

  constructor(
    code: JsonSchemaInferenceErrorCode,
    message: string,
    diagnostics?: SchemaDiagnostic[],
  ) {
    super(message);
    this.code = code;
    this.diagnostics = diagnostics;
    this.name = "JsonSchemaInferenceError";
  }
}

export function isJsonSchemaInferenceError(
  error: unknown,
): error is JsonSchemaInferenceError {
  return error instanceof JsonSchemaInferenceError;
}

export function throwJsonSchemaInferenceError(
  code: JsonSchemaInferenceErrorCode,
  message: string,
  diagnostics: SchemaDiagnostic[],
): never {
  throw new JsonSchemaInferenceError(code, message, diagnostics);
}
