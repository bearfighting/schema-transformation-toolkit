import type { SchemaDiagnostic } from "@aio/core";
import ts from "typescript";
import {
  collectBlockingTopLevelStatements,
  collectExportAllReferences,
  collectExportedTopLevelDeclarations,
  collectImportedTypeReferences,
  collectReExportedTypeReferences,
  collectTopLevelDeclarations,
  findTypeScriptEntryDeclaration,
  findNamedTopLevelStatement,
} from "./entry.js";
import {
  invalidTypeScriptSyntaxDiagnostic,
  missingEntryDeclarationDiagnostic,
  missingEntryNameDiagnostic,
  unsupportedEntryDeclarationKindDiagnostic,
  unsupportedExportAllEntryDiagnostic,
  unsupportedReExportedEntryDiagnostic,
  unsupportedTopLevelModuleStatementDiagnostic,
} from "./diagnostics.js";
import { createUnsupportedDeclarationShapeDiagnostic } from "./declaration-shape.js";
import {
  analyzeImplicitEntry,
  derivePreferredEntryNameFromDocumentName,
  type TypeScriptImplicitEntryAnalysis,
} from "./implicit-entry.js";
import {
  createTypeScriptSourceFile,
  getTypeScriptSourceLocation,
  getTypeScriptSourceLocationFromSpan,
} from "./syntax.js";
import { collectReachableDeclarationNames } from "./reachability.js";
import type { ResolvedTypeScriptParseOptions } from "./options.js";
import type { TypeScriptEntryDeclaration } from "./types.js";

export interface TypeScriptPreprocessSuccessResult {
  ok: true;
  sourceFile: ts.SourceFile;
  entryDeclaration: TypeScriptEntryDeclaration;
  declarationMap: ReadonlyMap<string, TypeScriptEntryDeclaration>;
  declarationNames: Set<string>;
  importedTypeMap: ReadonlyMap<string, string>;
  implicitEntryAnalysis: TypeScriptImplicitEntryAnalysis;
}

export interface TypeScriptPreprocessFailureResult {
  ok: false;
  code:
    | "missing-typescript-entry"
    | "missing-typescript-entry-declaration"
    | "unsupported-typescript-syntax"
    | "unsupported-typescript-entry-declaration-kind"
    | "unsupported-typescript-interface-heritage"
    | "unsupported-typescript-export-all-entry"
    | "unsupported-typescript-top-level-module-statement"
    | "unsupported-typescript-reexported-entry";
  message: string;
  diagnostics: SchemaDiagnostic[];
}

export type TypeScriptPreprocessResult =
  TypeScriptPreprocessSuccessResult | TypeScriptPreprocessFailureResult;

export function preprocessTypeScriptSource(
  input: string,
  options: ResolvedTypeScriptParseOptions,
): TypeScriptPreprocessResult {
  const sourceFile = createTypeScriptSourceFile(input);
  const sourceFileLocation = getTypeScriptSourceLocation(sourceFile);
  const firstParseDiagnostic = (
    sourceFile as ts.SourceFile & {
      parseDiagnostics?: readonly ts.DiagnosticWithLocation[];
    }
  ).parseDiagnostics?.[0];

  if (firstParseDiagnostic) {
    const location =
      firstParseDiagnostic.start !== undefined
        ? getTypeScriptSourceLocationFromSpan(
            sourceFile,
            firstParseDiagnostic.start,
            firstParseDiagnostic.length ?? 0,
          )
        : getTypeScriptSourceLocation(sourceFile);

    return {
      ok: false,
      code: "unsupported-typescript-syntax",
      message:
        "The TypeScript parser could not parse the source because it contains syntax errors.",
      diagnostics: [
        invalidTypeScriptSyntaxDiagnostic({
          documentName: options.name,
          detail: ts.flattenDiagnosticMessageText(
            firstParseDiagnostic.messageText,
            "\n",
          ),
          ...(options.entry ? { requestedEntry: options.entry } : {}),
          sourceLocation: location,
        }),
      ],
    };
  }

  const declarationMap = collectTopLevelDeclarations(sourceFile);
  const declarationNames = new Set(declarationMap.keys());
  const exportedDeclarationMap =
    collectExportedTopLevelDeclarations(sourceFile);
  const availableDeclarations = Array.from(declarationMap.keys()).sort();
  const availableExportedDeclarations = Array.from(
    exportedDeclarationMap.keys(),
  ).sort();
  const implicitEntryAnalysis = analyzeImplicitEntry({
    declarationMap,
    exportedDeclarationMap,
    ...(derivePreferredEntryNameFromDocumentName(options.name)
      ? {
          preferredEntryName: derivePreferredEntryNameFromDocumentName(
            options.name,
          ),
        }
      : {}),
  });
  const importedTypeMap = collectImportedTypeReferences(sourceFile);
  const reExportedTypeMap = collectReExportedTypeReferences(sourceFile);
  const exportAllReferences = collectExportAllReferences(sourceFile);
  const blockingTopLevelStatements =
    collectBlockingTopLevelStatements(sourceFile);
  const requestedEntry = options.entry ?? implicitEntryAnalysis.entryName;

  if (!requestedEntry) {
    return {
      ok: false,
      code: "missing-typescript-entry",
      message:
        "TypeScript parser v0 requires an explicit entry declaration name.",
      diagnostics: [
        missingEntryNameDiagnostic({
          documentName: options.name,
          availableDeclarations,
          availableExportedDeclarations,
          rootCandidates: implicitEntryAnalysis.rootCandidates,
          exportedRootCandidates: implicitEntryAnalysis.exportedRootCandidates,
          ...(implicitEntryAnalysis.ambiguityReason
            ? {
                implicitEntryAmbiguityReason:
                  implicitEntryAnalysis.ambiguityReason,
              }
            : {}),
          sourceLocation: sourceFileLocation,
        }),
      ],
    };
  }

  const entryDeclaration = findTypeScriptEntryDeclaration(
    sourceFile,
    requestedEntry,
  );

  if (!entryDeclaration) {
    const namedStatement = findNamedTopLevelStatement(
      sourceFile,
      requestedEntry,
    );

    if (namedStatement) {
      const declarationKind = ts.SyntaxKind[namedStatement.kind];

      return {
        ok: false,
        code: "unsupported-typescript-entry-declaration-kind",
        message: `The TypeScript parser found a declaration named "${requestedEntry}", but top-level ${declarationKind} entries are outside the supported schema subset.`,
        diagnostics: [
          unsupportedEntryDeclarationKindDiagnostic({
            documentName: options.name,
            entry: requestedEntry,
            requestedEntry,
            declarationKind,
            declarationText: namedStatement.getText(),
            availableDeclarations,
            availableExportedDeclarations,
            sourceLocation: getTypeScriptSourceLocation(namedStatement),
          }),
        ],
      };
    }

    const reExportedEntry = reExportedTypeMap.get(requestedEntry);

    if (reExportedEntry) {
      return {
        ok: false,
        code: "unsupported-typescript-reexported-entry",
        message: `The TypeScript parser found entry "${requestedEntry}" only as a re-export from "${reExportedEntry.moduleSpecifier}", which is outside the current single-file schema subset.`,
        diagnostics: [
          unsupportedReExportedEntryDiagnostic({
            documentName: options.name,
            entry: requestedEntry,
            requestedEntry,
            importedName: reExportedEntry.importedName,
            moduleSpecifier: reExportedEntry.moduleSpecifier,
            declarationText: reExportedEntry.declarationText,
            availableDeclarations,
            availableExportedDeclarations,
            sourceLocation: reExportedEntry.sourceLocation,
          }),
        ],
      };
    }

    if (options.entry && exportAllReferences.length > 0) {
      const firstExportAllReference = exportAllReferences[0]!;

      return {
        ok: false,
        code: "unsupported-typescript-export-all-entry",
        message: `The TypeScript parser could not resolve whether entry "${requestedEntry}" is forwarded through export-all statements in the current single-file schema subset.`,
        diagnostics: [
          unsupportedExportAllEntryDiagnostic({
            documentName: options.name,
            entry: requestedEntry,
            requestedEntry,
            moduleSpecifiers: exportAllReferences.map(
              (reference) => reference.moduleSpecifier,
            ),
            declarationText: firstExportAllReference.declarationText,
            availableDeclarations,
            availableExportedDeclarations,
            sourceLocation: firstExportAllReference.sourceLocation,
          }),
        ],
      };
    }

    if (options.entry && blockingTopLevelStatements.length > 0) {
      const firstBlockingStatement = blockingTopLevelStatements[0]!;

      return {
        ok: false,
        code: "unsupported-typescript-top-level-module-statement",
        message: `The TypeScript parser found top-level ${firstBlockingStatement.statementKind} syntax while resolving entry "${requestedEntry}", and that module-level form is outside the current single-file schema subset.`,
        diagnostics: [
          unsupportedTopLevelModuleStatementDiagnostic({
            documentName: options.name,
            entry: requestedEntry,
            requestedEntry,
            statementKind: firstBlockingStatement.statementKind,
            declarationText: firstBlockingStatement.declarationText,
            availableDeclarations,
            availableExportedDeclarations,
            sourceLocation: firstBlockingStatement.sourceLocation,
          }),
        ],
      };
    }

    return {
      ok: false,
      code: "missing-typescript-entry-declaration",
      message: `The TypeScript parser could not find a supported declaration named "${requestedEntry}".`,
      diagnostics: [
        missingEntryDeclarationDiagnostic({
          documentName: options.name,
          entry: requestedEntry,
          requestedEntry,
          availableDeclarations,
          availableExportedDeclarations,
          sourceLocation: sourceFileLocation,
        }),
      ],
    };
  }

  const reachableDeclarationNames = collectReachableDeclarationNames(
    entryDeclaration.name.text,
    declarationMap,
  );

  for (const reachableName of reachableDeclarationNames) {
    const reachableDeclaration = declarationMap.get(reachableName);

    if (!reachableDeclaration) {
      continue;
    }

    const shapeDiagnostic = createUnsupportedDeclarationShapeDiagnostic(
      reachableDeclaration,
      options.name,
      ["definitions", reachableName],
    );

    if (shapeDiagnostic) {
      return {
        ok: false,
        code: "unsupported-typescript-interface-heritage",
        message:
          "Interface extends clauses are outside the supported TypeScript schema subset.",
        diagnostics: [shapeDiagnostic],
      };
    }
  }

  return {
    ok: true,
    sourceFile,
    entryDeclaration,
    declarationMap,
    declarationNames,
    importedTypeMap,
    implicitEntryAnalysis,
  };
}
