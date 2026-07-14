import ts from "typescript";
import type { TypeScriptEntryDeclaration } from "./types.js";

export function findTypeScriptEntryDeclaration(
  sourceFile: ts.SourceFile,
  entry: string,
): TypeScriptEntryDeclaration | undefined {
  for (const statement of sourceFile.statements) {
    if (
      ts.isTypeAliasDeclaration(statement) ||
      ts.isInterfaceDeclaration(statement) ||
      ts.isEnumDeclaration(statement)
    ) {
      if (statement.name.text === entry) {
        return statement;
      }
    }
  }

  return undefined;
}

export function collectTopLevelDeclarationNames(
  sourceFile: ts.SourceFile,
): Set<string> {
  return new Set(collectTopLevelDeclarations(sourceFile).keys());
}

export function collectTopLevelDeclarations(
  sourceFile: ts.SourceFile,
): Map<string, TypeScriptEntryDeclaration> {
  const declarations = new Map<string, TypeScriptEntryDeclaration>();

  for (const statement of sourceFile.statements) {
    if (
      ts.isTypeAliasDeclaration(statement) ||
      ts.isInterfaceDeclaration(statement) ||
      ts.isEnumDeclaration(statement)
    ) {
      declarations.set(statement.name.text, statement);
    }
  }

  return declarations;
}
