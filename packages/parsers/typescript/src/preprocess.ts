import type { SchemaDiagnostic } from "@aio/core";
import ts from "typescript";
import {
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
  unsupportedReExportedEntryDiagnostic,
} from "./diagnostics.js";
import { createUnsupportedDeclarationShapeDiagnostic } from "./declaration-shape.js";
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
}

export interface TypeScriptPreprocessFailureResult {
  ok: false;
  code:
    | "missing-typescript-entry"
    | "missing-typescript-entry-declaration"
    | "unsupported-typescript-syntax"
    | "unsupported-typescript-entry-declaration-kind"
    | "unsupported-typescript-interface-heritage"
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
          detail: ts.flattenDiagnosticMessageText(
            firstParseDiagnostic.messageText,
            "\n",
          ),
          sourceLocation: location,
        }),
      ],
    };
  }

  if (!options.entry) {
    return {
      ok: false,
      code: "missing-typescript-entry",
      message:
        "TypeScript parser v0 requires an explicit entry declaration name.",
      diagnostics: [
        missingEntryNameDiagnostic(getTypeScriptSourceLocation(sourceFile)),
      ],
    };
  }

  const declarationMap = collectTopLevelDeclarations(sourceFile);
  const declarationNames = new Set(declarationMap.keys());
  const importedTypeMap = collectImportedTypeReferences(sourceFile);
  const reExportedTypeMap = collectReExportedTypeReferences(sourceFile);
  const entryDeclaration = findTypeScriptEntryDeclaration(
    sourceFile,
    options.entry,
  );

  if (!entryDeclaration) {
    const namedStatement = findNamedTopLevelStatement(
      sourceFile,
      options.entry,
    );

    if (namedStatement) {
      const declarationKind = ts.SyntaxKind[namedStatement.kind];

      return {
        ok: false,
        code: "unsupported-typescript-entry-declaration-kind",
        message: `The TypeScript parser found a declaration named "${options.entry}", but top-level ${declarationKind} entries are outside the supported schema subset.`,
        diagnostics: [
          unsupportedEntryDeclarationKindDiagnostic({
            entry: options.entry,
            declarationKind,
            declarationText: namedStatement.getText(),
            sourceLocation: getTypeScriptSourceLocation(namedStatement),
          }),
        ],
      };
    }

    const reExportedEntry = reExportedTypeMap.get(options.entry);

    if (reExportedEntry) {
      return {
        ok: false,
        code: "unsupported-typescript-reexported-entry",
        message: `The TypeScript parser found entry "${options.entry}" only as a re-export from "${reExportedEntry.moduleSpecifier}", which is outside the current single-file schema subset.`,
        diagnostics: [
          unsupportedReExportedEntryDiagnostic({
            entry: options.entry,
            importedName: reExportedEntry.importedName,
            moduleSpecifier: reExportedEntry.moduleSpecifier,
            declarationText: reExportedEntry.declarationText,
            sourceLocation: reExportedEntry.sourceLocation,
          }),
        ],
      };
    }

    return {
      ok: false,
      code: "missing-typescript-entry-declaration",
      message: `The TypeScript parser could not find a supported declaration named "${options.entry}".`,
      diagnostics: [
        {
          ...missingEntryDeclarationDiagnostic(
            options.entry,
            getTypeScriptSourceLocation(sourceFile),
          ),
          evidence: {
            entry: options.entry,
            availableDeclarations: Array.from(declarationNames).sort(),
            sourceLocation: getTypeScriptSourceLocation(sourceFile),
          },
        },
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
  };
}
