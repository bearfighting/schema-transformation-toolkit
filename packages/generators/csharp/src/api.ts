import type {
  SchemaDocument,
  SchemaSemanticNote,
} from "@schema-transformation-toolkit/core";
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
    const result = renderCSharpDocument(document, resolved);
    const semanticNotes: SchemaSemanticNote[] = result.notes.map((note) => ({
      kind: note.kind,
      code: note.code,
      message: note.message,
      source: "generator-csharp",
      layer: "target",
      ...(note.path ? { path: note.path } : {}),
    }));
    return {
      ok: true,
      output: result.output,
      ...(semanticNotes.length ? { semanticNotes } : {}),
    };
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
