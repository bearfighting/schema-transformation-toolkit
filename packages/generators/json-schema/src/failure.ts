import type { GenerateFailureResult, GenerateSuccessResult } from "@aio/core";
import type { JsonSchemaOutput } from "./options.js";

export type JsonSchemaGeneratorFailureCode =
  | "invalid-json-schema-reference"
  | "invalid-record-key"
  | "unsupported-node-kind";

export type JsonSchemaGenerateFailureResult =
  GenerateFailureResult<JsonSchemaGeneratorFailureCode>;

export type JsonSchemaGenerateResult =
  GenerateSuccessResult<JsonSchemaOutput> | JsonSchemaGenerateFailureResult;
