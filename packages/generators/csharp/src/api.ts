import type { SchemaDocument } from "@schema-transformation-toolkit/core";
import { CSharpGenerationError, type CSharpGenerateResult } from "./failure.js";
import {
  assertSupportedCSharpGeneratorOptions,
  resolveCSharpGeneratorOptions,
  type CSharpGeneratorOptions,
} from "./options.js";
import { renderCSharpDocument } from "./emit.js";

export function tryGenerateCSharp(
  document: SchemaDocument,
  options: CSharpGeneratorOptions = {},
): CSharpGenerateResult {
  const resolved = resolveCSharpGeneratorOptions(options);
  try {
    assertSupportedCSharpGeneratorOptions(resolved);
    return { ok: true, output: renderCSharpDocument(document, resolved) };
  } catch (error) {
    return {
      ok: false,
      code:
        error instanceof CSharpGenerationError
          ? error.code
          : "unsupported-csharp-node",
      message: error instanceof Error ? error.message : "C# generation failed.",
    };
  }
}

export function generateCSharp(
  document: SchemaDocument,
  options: CSharpGeneratorOptions = {},
): string {
  const result = tryGenerateCSharp(document, options);
  if (!result.ok) throw new Error(result.message);
  return result.output;
}
