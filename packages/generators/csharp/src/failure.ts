import type {
  GenerateFailureResult,
  GenerateSuccessResult,
} from "@schema-transformation-toolkit/core";

export type CSharpGeneratorFailureCode =
  | "invalid-generator-input"
  | "unsupported-csharp-root"
  | "unsupported-csharp-node"
  | "unsupported-csharp-representation"
  | "invalid-csharp-identifier"
  | "invalid-csharp-namespace"
  | "invalid-csharp-style"
  | "unresolved-csharp-reference"
  | "duplicate-csharp-definition"
  | "unsupported-csharp-enum"
  | "csharp-enum-name-collision";

export class CSharpGenerationError extends Error {
  constructor(
    readonly code: CSharpGeneratorFailureCode,
    message: string,
  ) {
    super(message);
    this.name = "CSharpGenerationError";
  }
}

export type CSharpGenerateFailureResult =
  GenerateFailureResult<CSharpGeneratorFailureCode>;

export type CSharpGenerateResult =
  GenerateSuccessResult<string> | CSharpGenerateFailureResult;
