import type { GenerateFailureResult, GenerateSuccessResult } from "@aio/core";

export type TypeScriptGeneratorFailureCode =
  | "invalid-type-name"
  | "invalid-field-name"
  | "unsupported-node-kind";

export type TypeScriptGenerateFailureResult =
  GenerateFailureResult<TypeScriptGeneratorFailureCode>;

export type TypeScriptGenerateResult =
  | GenerateSuccessResult<string>
  | TypeScriptGenerateFailureResult;
