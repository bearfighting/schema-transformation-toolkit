import type {
  SchemaDocument,
  SchemaSemanticNote,
} from "@schema-transformation-toolkit/core";
import { parseCSharpSyntax } from "./syntax.js";
import { mapCSharpFile } from "./semantic.js";
import {
  CSharpSemanticError,
  CSharpSyntaxError,
  type CSharpParseFailureResult,
  type CSharpParserFailureCode,
} from "./failure.js";
import {
  assertSupportedCSharpParseOptions,
  resolveCSharpParseOptions,
  type CSharpParserOptions,
} from "./options.js";

export interface CSharpParseSuccessResult {
  ok: true;
  document: SchemaDocument;
  semanticNotes?: SchemaSemanticNote[];
}
export type CSharpParseResult =
  CSharpParseSuccessResult | CSharpParseFailureResult;
export function tryParseCSharp(
  input: string,
  options: CSharpParserOptions = {},
): CSharpParseResult {
  const resolved = resolveCSharpParseOptions(options);
  try {
    assertSupportedCSharpParseOptions(resolved);
    const result = mapCSharpFile(
      parseCSharpSyntax(input),
      resolved.name,
      resolved.entry,
    );
    return {
      ok: true,
      document: result.document,
      ...(result.semanticNotes.length
        ? { semanticNotes: result.semanticNotes }
        : {}),
    };
  } catch (error) {
    const syntax = error instanceof CSharpSyntaxError ? error : undefined;
    const semantic = error instanceof CSharpSemanticError ? error : undefined;
    const code = (semantic?.code ??
      syntax?.code ??
      "unsupported-csharp-parser-v1") as CSharpParserFailureCode;
    const message =
      error instanceof Error ? error.message : "C# parser failed.";
    return {
      ok: false,
      code,
      message,
      diagnostics: [
        {
          severity: "error",
          code,
          message,
          source: "parser-csharp",
          ...((syntax?.position ?? semantic?.position)
            ? {
                evidence: {
                  position: syntax?.position ?? semantic?.position,
                  sourceLength: input.length,
                },
              }
            : {}),
        },
      ],
    };
  }
}
export function parseCSharp(
  input: string,
  options: CSharpParserOptions = {},
): SchemaDocument {
  const result = tryParseCSharp(input, options);
  if (!result.ok) throw new Error(result.message);
  return result.document;
}
export const csharpParser = {
  format: "csharp" as const,
  parse(input: string, options: CSharpParserOptions = {}) {
    return tryParseCSharp(input, options);
  },
};
