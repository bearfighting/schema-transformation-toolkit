import ts from "typescript";
import type {
  TypeScriptBlockingTopLevelStatement,
  TypeScriptEntryDeclaration,
  TypeScriptExportAllReference,
  TypeScriptNamedTopLevelStatement,
  TypeScriptReExportReference,
} from "./types.js";
import { getTypeScriptSourceLocation } from "./syntax.js";

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

export function collectExportedTopLevelDeclarations(
  sourceFile: ts.SourceFile,
): Map<string, TypeScriptEntryDeclaration> {
  const declarations = new Map<string, TypeScriptEntryDeclaration>();

  for (const statement of sourceFile.statements) {
    if (!(
      ts.isTypeAliasDeclaration(statement) ||
      ts.isInterfaceDeclaration(statement) ||
      ts.isEnumDeclaration(statement)
    )) {
      continue;
    }

    if (!hasExportModifier(statement)) {
      continue;
    }

    declarations.set(statement.name.text, statement);
  }

  return declarations;
}

export function collectImportedTypeReferences(
  sourceFile: ts.SourceFile,
): Map<string, string> {
  const importedTypes = new Map<string, string>();

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !statement.importClause) {
      continue;
    }

    const moduleSpecifier = ts.isStringLiteral(statement.moduleSpecifier)
      ? statement.moduleSpecifier.text
      : statement.moduleSpecifier.getText();

    if (statement.importClause.name) {
      importedTypes.set(statement.importClause.name.text, moduleSpecifier);
    }

    const namedBindings = statement.importClause.namedBindings;

    if (!namedBindings) {
      continue;
    }

    if (ts.isNamespaceImport(namedBindings)) {
      importedTypes.set(namedBindings.name.text, moduleSpecifier);
      continue;
    }

    for (const element of namedBindings.elements) {
      importedTypes.set(element.name.text, moduleSpecifier);
    }
  }

  return importedTypes;
}

export function collectReExportedTypeReferences(
  sourceFile: ts.SourceFile,
): Map<string, TypeScriptReExportReference> {
  const reExports = new Map<string, TypeScriptReExportReference>();

  for (const statement of sourceFile.statements) {
    if (
      !ts.isExportDeclaration(statement) ||
      !statement.moduleSpecifier ||
      !statement.exportClause
    ) {
      continue;
    }

    const moduleSpecifier = ts.isStringLiteral(statement.moduleSpecifier)
      ? statement.moduleSpecifier.text
      : statement.moduleSpecifier.getText();

    if (ts.isNamespaceExport(statement.exportClause)) {
      reExports.set(statement.exportClause.name.text, {
        exportedName: statement.exportClause.name.text,
        importedName: "*",
        moduleSpecifier,
        declarationText: statement.getText(),
        sourceLocation: getTypeScriptSourceLocation(statement),
      });
      continue;
    }

    if (!ts.isNamedExports(statement.exportClause)) {
      continue;
    }

    for (const element of statement.exportClause.elements) {
      const exportedName = element.name.text;
      const importedName = element.propertyName?.text ?? exportedName;

      reExports.set(exportedName, {
        exportedName,
        importedName,
        moduleSpecifier,
        declarationText: statement.getText(),
        sourceLocation: getTypeScriptSourceLocation(statement),
      });
    }
  }

  return reExports;
}

export function collectExportAllReferences(
  sourceFile: ts.SourceFile,
): TypeScriptExportAllReference[] {
  const exportAllReferences: TypeScriptExportAllReference[] = [];

  for (const statement of sourceFile.statements) {
    if (
      !ts.isExportDeclaration(statement) ||
      !statement.moduleSpecifier ||
      statement.exportClause
    ) {
      continue;
    }

    const moduleSpecifier = ts.isStringLiteral(statement.moduleSpecifier)
      ? statement.moduleSpecifier.text
      : statement.moduleSpecifier.getText();

    exportAllReferences.push({
      moduleSpecifier,
      declarationText: statement.getText(),
      sourceLocation: getTypeScriptSourceLocation(statement),
    });
  }

  return exportAllReferences;
}

export function collectBlockingTopLevelStatements(
  sourceFile: ts.SourceFile,
): TypeScriptBlockingTopLevelStatement[] {
  const blockingStatements: TypeScriptBlockingTopLevelStatement[] = [];

  for (const statement of sourceFile.statements) {
    const isAmbientModuleDeclaration =
      ts.isModuleDeclaration(statement) &&
      !ts.isIdentifier(statement.name) &&
      statement.body !== undefined;

    if (!ts.isExportAssignment(statement) && !isAmbientModuleDeclaration) {
      continue;
    }

    blockingStatements.push({
      statementKind: ts.SyntaxKind[statement.kind],
      declarationText: statement.getText(),
      sourceLocation: getTypeScriptSourceLocation(statement),
    });
  }

  return blockingStatements;
}

export function findNamedTopLevelStatement(
  sourceFile: ts.SourceFile,
  entry: string,
): TypeScriptNamedTopLevelStatement | undefined {
  for (const statement of sourceFile.statements) {
    if (
      ts.isTypeAliasDeclaration(statement) ||
      ts.isInterfaceDeclaration(statement) ||
      ts.isEnumDeclaration(statement) ||
      ts.isClassDeclaration(statement) ||
      ts.isModuleDeclaration(statement)
    ) {
      const statementName = statement.name;

      if (!statementName || !ts.isIdentifier(statementName)) {
        continue;
      }

      if (statementName.text === entry) {
        return statement;
      }
    }
  }

  return undefined;
}

function hasExportModifier(statement: ts.Node): boolean {
  return (
    ts.canHaveModifiers(statement) &&
    (ts
      .getModifiers(statement)
      ?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ??
      false)
  );
}
