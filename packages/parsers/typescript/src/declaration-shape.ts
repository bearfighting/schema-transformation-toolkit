import type { SchemaDiagnostic } from "@aio/core";
import ts from "typescript";
import { createTypeScriptUnsupportedDiagnostic } from "./diagnostics.js";
import { getTypeScriptSourceLocation } from "./syntax.js";
import type { TypeScriptEntryDeclaration } from "./types.js";

export function createUnsupportedDeclarationShapeDiagnostic(
  declaration: TypeScriptEntryDeclaration,
  sourceName: string,
  path: string[],
): SchemaDiagnostic | null {
  if (
    ts.isInterfaceDeclaration(declaration) &&
    declaration.heritageClauses &&
    declaration.heritageClauses.length > 0
  ) {
    const heritageText = declaration.heritageClauses
      .map((clause) => clause.getText())
      .join(" ");

    return createTypeScriptUnsupportedDiagnostic({
      code: "unsupported-typescript-interface-heritage",
      message:
        "Interface extends clauses are outside the supported TypeScript schema subset.",
      detail: `Unsupported interface heritage: ${heritageText}.`,
      path,
      nodeKind: "definition",
      sourceLocation: getTypeScriptSourceLocation(declaration),
      evidence: {
        documentName: sourceName,
        syntaxKind: ts.SyntaxKind[declaration.kind],
        nodeText: declaration.getText(),
        heritageClauses: declaration.heritageClauses.map((clause) =>
          clause.getText(),
        ),
      },
    });
  }

  return null;
}
