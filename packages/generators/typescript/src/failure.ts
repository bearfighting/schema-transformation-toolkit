import type { GenerateFailureResult, GenerateSuccessResult } from "@aio/core";

export type TypeScriptGeneratorFailureCode =
  | "invalid-type-name"
  | "duplicate-rendered-type-name"
  | "duplicate-rendered-field-name"
  | "invalid-field-name"
  | "invalid-record-key"
  | "invalid-reference-name"
  | "unsupported-node-kind";

export type TypeScriptGenerateFailureResult =
  GenerateFailureResult<TypeScriptGeneratorFailureCode>;

export type TypeScriptGenerateResult =
  GenerateSuccessResult<string> | TypeScriptGenerateFailureResult;
