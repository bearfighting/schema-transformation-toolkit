import {
  collectExportedTopLevelDeclarations,
  collectTopLevelDeclarations,
} from "./entry.js";
import { createTypeScriptSourceFile } from "./syntax.js";
import type { TypeScriptEntryDeclaration } from "./types.js";
import { collectLocalReferencedDeclarationNames } from "./reachability.js";

/**
 * Ambiguity reasons are intentionally narrow and mutually exclusive.
 *
 * They answer "why could preprocess not choose an implicit entry?" after all
 * supported single-file root-discovery rules have been attempted.
 *
 * Taxonomy:
 * - `multiple-exported-root-candidates`: exported declarations still expose
 *   more than one plausible public root.
 * - `multiple-local-root-candidates`: exported declarations do not disambiguate,
 *   and the local declaration graph still has multiple plausible roots.
 * - `cyclic-root-candidates`: no declaration root exists because every
 *   declaration participates in a cycle or is consumed by one.
 */
export type TypeScriptImplicitEntryAmbiguityReason =
  | "multiple-exported-root-candidates"
  | "multiple-local-root-candidates"
  | "cyclic-root-candidates";

/**
 * Selection reasons are ordered from strongest source-based evidence to the
 * weakest still-acceptable conservative tie-breaker.
 *
 * Taxonomy:
 * - `single-declaration`: the file has exactly one supported declaration.
 * - `single-exported-declaration`: the file has multiple declarations but only
 *   one exported supported declaration.
 * - `single-exported-root`: exported declarations exist, and their exported
 *   dependency graph collapses to one root.
 * - `single-root`: exported declarations do not help, but the local dependency
 *   graph still collapses to one root.
 * - `document-name-match`: root discovery remains ambiguous until a custom
 *   `...Document` name matches exactly one root candidate.
 */
export type TypeScriptImplicitEntrySelectionReason =
  | "single-declaration"
  | "single-exported-declaration"
  | "single-exported-root"
  | "single-root"
  | "document-name-match";

/**
 * Shared internal contract for implicit-entry analysis.
 *
 * Invariants:
 * - success-like analyses set `entryName` and `selectionReason`
 * - ambiguous analyses set `ambiguityReason`
 * - `rootCandidates` always describe local graph roots
 * - `exportedRootCandidates` always describe exported graph roots
 */
export interface TypeScriptImplicitEntryAnalysis {
  entryName?: string | undefined;
  rootCandidates: string[];
  exportedRootCandidates: string[];
  selectionReason?: TypeScriptImplicitEntrySelectionReason;
  ambiguityReason?: TypeScriptImplicitEntryAmbiguityReason;
}

/**
 * Analyze implicit entry candidates from already-collected declaration maps.
 *
 * Rule order is part of the contract:
 * 1. exact single declaration
 * 2. exact single exported declaration
 * 3. exact single exported root
 * 4. exact single local root
 * 5. conservative document-name tie-break
 * 6. explicit ambiguity classification
 */
export function analyzeImplicitEntry(options: {
  declarationMap: ReadonlyMap<string, TypeScriptEntryDeclaration>;
  exportedDeclarationMap: ReadonlyMap<string, TypeScriptEntryDeclaration>;
  preferredEntryName?: string | undefined;
}): TypeScriptImplicitEntryAnalysis {
  const { declarationMap, exportedDeclarationMap, preferredEntryName } =
    options;

  if (declarationMap.size === 1) {
    return {
      ...(declarationMap.keys().next().value
        ? { entryName: declarationMap.keys().next().value }
        : {}),
      rootCandidates: Array.from(declarationMap.keys()).sort(),
      exportedRootCandidates: collectRootDeclarationNames(
        exportedDeclarationMap,
      ),
      selectionReason: "single-declaration",
    };
  }

  const rootCandidates = collectRootDeclarationNames(declarationMap);

  if (exportedDeclarationMap.size === 1) {
    return {
      ...(exportedDeclarationMap.keys().next().value
        ? { entryName: exportedDeclarationMap.keys().next().value }
        : {}),
      rootCandidates,
      exportedRootCandidates: Array.from(exportedDeclarationMap.keys()).sort(),
      selectionReason: "single-exported-declaration",
    };
  }

  const exportedRootCandidates = collectRootDeclarationNames(
    exportedDeclarationMap,
  );

  if (exportedRootCandidates.length === 1) {
    return {
      ...(exportedRootCandidates[0]
        ? { entryName: exportedRootCandidates[0] }
        : {}),
      rootCandidates,
      exportedRootCandidates,
      selectionReason: "single-exported-root",
    };
  }

  if (rootCandidates.length === 1) {
    return {
      ...(rootCandidates[0] ? { entryName: rootCandidates[0] } : {}),
      rootCandidates,
      exportedRootCandidates,
      selectionReason: "single-root",
    };
  }

  if (preferredEntryName) {
    if (exportedRootCandidates.includes(preferredEntryName)) {
      return {
        entryName: preferredEntryName,
        rootCandidates,
        exportedRootCandidates,
        selectionReason: "document-name-match",
      };
    }

    if (rootCandidates.includes(preferredEntryName)) {
      return {
        entryName: preferredEntryName,
        rootCandidates,
        exportedRootCandidates,
        selectionReason: "document-name-match",
      };
    }
  }

  return {
    rootCandidates,
    exportedRootCandidates,
    ambiguityReason:
      exportedRootCandidates.length > 1
        ? "multiple-exported-root-candidates"
        : rootCandidates.length > 1
          ? "multiple-local-root-candidates"
          : "cyclic-root-candidates",
  };
}

export function analyzeImplicitEntryFromSource(
  input: string,
  preferredEntryName?: string,
): TypeScriptImplicitEntryAnalysis {
  const sourceFile = createTypeScriptSourceFile(input);

  return analyzeImplicitEntry({
    declarationMap: collectTopLevelDeclarations(sourceFile),
    exportedDeclarationMap: collectExportedTopLevelDeclarations(sourceFile),
    ...(preferredEntryName ? { preferredEntryName } : {}),
  });
}

/**
 * Derive a conservative preferred entry name from a custom document name.
 *
 * The default `TypeScriptDocument` is intentionally ignored so default parser
 * behavior never changes because of the package's fallback document name.
 */
export function derivePreferredEntryNameFromDocumentName(
  documentName: string,
): string | undefined {
  if (documentName === "TypeScriptDocument") {
    return undefined;
  }

  if (!documentName.endsWith("Document")) {
    return undefined;
  }

  const candidate = documentName.slice(0, -"Document".length);

  return candidate.length > 0 ? candidate : undefined;
}

/**
 * Collect declaration names that are not referenced by any other supported
 * declaration in the same map.
 */
export function collectRootDeclarationNames(
  declarationMap: ReadonlyMap<string, TypeScriptEntryDeclaration>,
): string[] {
  const referencedDeclarationNames = new Set<string>();

  for (const declaration of declarationMap.values()) {
    for (const referencedName of collectLocalReferencedDeclarationNames(
      declaration,
      declarationMap,
    )) {
      referencedDeclarationNames.add(referencedName);
    }
  }

  return Array.from(declarationMap.keys())
    .filter((name) => !referencedDeclarationNames.has(name))
    .sort();
}
