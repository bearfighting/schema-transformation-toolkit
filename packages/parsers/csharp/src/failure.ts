import type { ParseFailureResult } from "@schema-transformation-toolkit/core";

export interface CSharpPosition {
  offset: number;
  line: number;
  column: number;
}

export type CSharpParserFailureCode =
  | "invalid-csharp-syntax"
  | "unsupported-csharp-declaration"
  | "unsupported-csharp-feature"
  | "unsupported-csharp-type"
  | "unsupported-csharp-generic"
  | "unsupported-csharp-namespace"
  | "unsupported-csharp-modifier"
  | "unsupported-csharp-property"
  | "unsupported-csharp-map-key"
  | "unknown-csharp-reference"
  | "duplicate-csharp-definition"
  | "duplicate-csharp-field"
  | "invalid-csharp-entry"
  | "ambiguous-csharp-root"
  | "missing-csharp-root"
  | "invalid-csharp-data-model"
  | "unsupported-csharp-parser-v1";

export type CSharpParseFailureResult =
  ParseFailureResult<CSharpParserFailureCode>;

export class CSharpSyntaxError extends Error {
  constructor(
    readonly code: CSharpParserFailureCode,
    message: string,
    readonly position?: CSharpPosition,
  ) {
    super(message);
    this.name = "CSharpSyntaxError";
  }
}

export class CSharpSemanticError extends Error {
  constructor(
    readonly code: CSharpParserFailureCode,
    message: string,
    readonly position?: CSharpPosition,
  ) {
    super(message);
    this.name = "CSharpSemanticError";
  }
}
