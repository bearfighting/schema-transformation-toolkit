import { expect } from "vitest";
import type { SchemaDiagnostic, SchemaSemanticNote } from "@aio/core";

export function expectDiagnosticCode(
  diagnostics: SchemaDiagnostic[] | undefined,
  code: string,
): void {
  expect(diagnostics).toContainEqual(
    expect.objectContaining({
      code,
    }),
  );
}

export function expectSemanticNoteCode(
  semanticNotes: SchemaSemanticNote[] | undefined,
  code: string,
): void {
  expect(semanticNotes).toContainEqual(
    expect.objectContaining({
      code,
    }),
  );
}

export function expectDiagnosticCodes(
  diagnostics: SchemaDiagnostic[] | undefined,
  codes: string[],
): void {
  for (const code of codes) {
    expectDiagnosticCode(diagnostics, code);
  }
}

export function expectSemanticNoteCodes(
  semanticNotes: SchemaSemanticNote[] | undefined,
  codes: string[],
): void {
  for (const code of codes) {
    expectSemanticNoteCode(semanticNotes, code);
  }
}
