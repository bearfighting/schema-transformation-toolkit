import { expect } from "vitest";
import ts from "typescript";

export function expectValidTypeScriptSyntax(
  output: string,
  fileName = "generated.ts",
): void {
  const sourceFile = ts.createSourceFile(
    fileName,
    output,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const parseDiagnostics =
    (
      sourceFile as typeof sourceFile & {
        parseDiagnostics?: readonly ts.Diagnostic[];
      }
    ).parseDiagnostics ?? [];

  expect(parseDiagnostics).toHaveLength(0);
}
