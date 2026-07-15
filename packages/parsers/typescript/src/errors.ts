import type { SchemaDiagnostic } from "@aio/core";

export type TypeScriptInferenceErrorCode =
  | "unsupported-typescript-enum-member-initializer"
  | "unsupported-typescript-entry-declaration-kind"
  | "unsupported-typescript-conditional-type"
  | "unsupported-typescript-function-type"
  | "unsupported-typescript-imported-type-reference"
  | "unsupported-typescript-interface-heritage"
  | "unsupported-typescript-intersection-type"
  | "unsupported-typescript-mapped-type"
  | "unsupported-typescript-namespace-import-reference"
  | "unsupported-typescript-property-name"
  | "unsupported-typescript-reexported-entry"
  | "unsupported-typescript-record-key"
  | "unsupported-typescript-syntax"
  | "unsupported-typescript-tuple-rest-element"
  | "unsupported-typescript-type-member"
  | "unsupported-typescript-type-reference"
  | "missing-typescript-property-type";

export class TypeScriptInferenceError extends Error {
  readonly code: TypeScriptInferenceErrorCode;
  readonly diagnostics: SchemaDiagnostic[] | undefined;

  constructor(
    code: TypeScriptInferenceErrorCode,
    message: string,
    diagnostics?: SchemaDiagnostic[],
  ) {
    super(message);
    this.code = code;
    this.diagnostics = diagnostics;
    this.name = "TypeScriptInferenceError";
  }
}

export function isTypeScriptInferenceError(
  error: unknown,
): error is TypeScriptInferenceError {
  return error instanceof TypeScriptInferenceError;
}

export function throwTypeScriptInferenceError(
  code: TypeScriptInferenceErrorCode,
  message: string,
  diagnostics: SchemaDiagnostic[],
): never {
  throw new TypeScriptInferenceError(code, message, diagnostics);
}
