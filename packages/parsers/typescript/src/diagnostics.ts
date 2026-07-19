import type {
  SchemaDiagnostic,
  SchemaDiagnosticNodeKind,
  SchemaSemanticNote,
  SchemaSemanticNoteKind,
  SchemaSemanticNoteLayer,
} from "@aio/core";
import { createSchemaObservation } from "@aio/core";
import type { TypeScriptInferenceErrorCode } from "./errors.js";
import type { TypeScriptImplicitEntrySelectionReason } from "./implicit-entry.js";
import type { TypeScriptSourceLocation } from "./types.js";

interface TypeScriptPreprocessDiagnosticContext {
  documentName: string;
  requestedEntry?: string;
  availableDeclarations?: string[];
  availableExportedDeclarations?: string[];
  rootCandidates?: string[];
  exportedRootCandidates?: string[];
  implicitEntryAmbiguityReason?:
    | "multiple-exported-root-candidates"
    | "multiple-local-root-candidates"
    | "cyclic-root-candidates";
  sourceLocation?: TypeScriptSourceLocation;
}

function createPreprocessDiagnosticEvidence(
  context: TypeScriptPreprocessDiagnosticContext,
  evidence: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    documentName: context.documentName,
    ...(context.requestedEntry
      ? { requestedEntry: context.requestedEntry }
      : {}),
    ...(context.availableDeclarations
      ? { availableDeclarations: context.availableDeclarations }
      : {}),
    ...(context.availableExportedDeclarations
      ? { availableExportedDeclarations: context.availableExportedDeclarations }
      : {}),
    ...(context.rootCandidates
      ? { rootCandidates: context.rootCandidates }
      : {}),
    ...(context.exportedRootCandidates
      ? { exportedRootCandidates: context.exportedRootCandidates }
      : {}),
    ...(context.implicitEntryAmbiguityReason
      ? {
          implicitEntryAmbiguityReason: context.implicitEntryAmbiguityReason,
        }
      : {}),
    ...(context.sourceLocation
      ? { sourceLocation: context.sourceLocation }
      : {}),
    ...evidence,
  };
}

export function missingEntryNameDiagnostic(
  context: TypeScriptPreprocessDiagnosticContext,
): SchemaDiagnostic {
  return {
    severity: "error",
    code: "missing-typescript-entry",
    message:
      "TypeScript parser v0 requires an explicit entry declaration name.",
    path: ["entry"],
    source: "parser-typescript",
    evidence: createPreprocessDiagnosticEvidence(context),
  };
}

export function missingEntryDeclarationDiagnostic(
  options: TypeScriptPreprocessDiagnosticContext & {
    entry: string;
  },
): SchemaDiagnostic {
  return {
    severity: "error",
    code: "missing-typescript-entry-declaration",
    message: `The TypeScript parser could not find a supported declaration named "${options.entry}".`,
    path: ["entry", options.entry],
    source: "parser-typescript",
    evidence: createPreprocessDiagnosticEvidence(options, {
      entry: options.entry,
    }),
  };
}

export function unsupportedEntryDeclarationKindDiagnostic(options: {
  documentName: string;
  entry: string;
  requestedEntry?: string;
  declarationKind: string;
  declarationText: string;
  availableDeclarations?: string[];
  availableExportedDeclarations?: string[];
  sourceLocation?: TypeScriptSourceLocation;
}): SchemaDiagnostic {
  return {
    severity: "error",
    code: "unsupported-typescript-entry-declaration-kind",
    message: `The TypeScript parser found a declaration named "${options.entry}", but top-level ${options.declarationKind} entries are outside the supported schema subset.`,
    path: ["entry", options.entry],
    nodeKind: "entry",
    source: "parser-typescript",
    evidence: createPreprocessDiagnosticEvidence(options, {
      entry: options.entry,
      declarationKind: options.declarationKind,
      declarationText: options.declarationText,
    }),
  };
}

export function unsupportedReExportedEntryDiagnostic(options: {
  documentName: string;
  entry: string;
  requestedEntry?: string;
  importedName: string;
  moduleSpecifier: string;
  declarationText: string;
  availableDeclarations?: string[];
  availableExportedDeclarations?: string[];
  sourceLocation?: TypeScriptSourceLocation;
}): SchemaDiagnostic {
  return {
    severity: "error",
    code: "unsupported-typescript-reexported-entry",
    message: `The TypeScript parser found entry "${options.entry}" only as a re-export from "${options.moduleSpecifier}", which is outside the current single-file schema subset.`,
    path: ["entry", options.entry],
    nodeKind: "entry",
    source: "parser-typescript",
    evidence: createPreprocessDiagnosticEvidence(options, {
      entry: options.entry,
      importedName: options.importedName,
      moduleSpecifier: options.moduleSpecifier,
      declarationText: options.declarationText,
    }),
  };
}

export function unsupportedExportAllEntryDiagnostic(options: {
  documentName: string;
  entry: string;
  requestedEntry?: string;
  moduleSpecifiers: string[];
  declarationText: string;
  availableDeclarations?: string[];
  availableExportedDeclarations?: string[];
  sourceLocation?: TypeScriptSourceLocation;
}): SchemaDiagnostic {
  return {
    severity: "error",
    code: "unsupported-typescript-export-all-entry",
    message: `The TypeScript parser could not resolve whether entry "${options.entry}" is forwarded through export-all statements in the current single-file schema subset.`,
    path: ["entry", options.entry],
    nodeKind: "entry",
    source: "parser-typescript",
    evidence: createPreprocessDiagnosticEvidence(options, {
      entry: options.entry,
      moduleSpecifiers: options.moduleSpecifiers,
      declarationText: options.declarationText,
    }),
  };
}

export function unsupportedTopLevelModuleStatementDiagnostic(options: {
  documentName: string;
  entry: string;
  requestedEntry?: string;
  statementKind: string;
  declarationText: string;
  availableDeclarations?: string[];
  availableExportedDeclarations?: string[];
  sourceLocation?: TypeScriptSourceLocation;
}): SchemaDiagnostic {
  return {
    severity: "error",
    code: "unsupported-typescript-top-level-module-statement",
    message: `The TypeScript parser found top-level ${options.statementKind} syntax while resolving entry "${options.entry}", and that module-level form is outside the current single-file schema subset.`,
    path: ["entry", options.entry],
    nodeKind: "entry",
    source: "parser-typescript",
    evidence: createPreprocessDiagnosticEvidence(options, {
      entry: options.entry,
      statementKind: options.statementKind,
      declarationText: options.declarationText,
    }),
  };
}

export function unsupportedTypeScriptParserV0Diagnostic(options: {
  documentName: string;
  entry?: string;
  detail?: string;
  sourceLocation?: TypeScriptSourceLocation;
}): SchemaDiagnostic {
  const evidence: {
    requestedEntry?: string;
    documentName: string;
    detail?: string;
    sourceLocation?: TypeScriptSourceLocation;
  } = {
    documentName: options.documentName,
    ...(options.entry ? { requestedEntry: options.entry } : {}),
    ...(options.detail ? { detail: options.detail } : {}),
    ...(options.sourceLocation
      ? { sourceLocation: options.sourceLocation }
      : {}),
  };

  return {
    severity: "error",
    code: "unsupported-typescript-parser-v0",
    message:
      "The TypeScript parser hit an unexpected fallback outside the supported v0 schema subset.",
    path: options.entry ? ["entry", options.entry] : ["document"],
    source: "parser-typescript",
    evidence,
  };
}

export function invalidTypeScriptSyntaxDiagnostic(options: {
  documentName: string;
  detail: string;
  requestedEntry?: string;
  sourceLocation?: TypeScriptSourceLocation;
}): SchemaDiagnostic {
  return {
    severity: "error",
    code: "unsupported-typescript-syntax",
    message:
      "The TypeScript parser could not parse the source because it contains syntax errors.",
    path: ["document"],
    source: "parser-typescript",
    evidence: createPreprocessDiagnosticEvidence(options, {
      detail: options.detail,
    }),
  };
}

export function createTypeScriptUnsupportedDiagnostic(options: {
  code: TypeScriptInferenceErrorCode;
  message: string;
  detail?: string;
  path?: string[];
  nodeKind?: SchemaDiagnosticNodeKind;
  sourceLocation?: TypeScriptSourceLocation;
  evidence?: Record<string, unknown>;
}): SchemaDiagnostic {
  return {
    severity: "error",
    code: options.code,
    message: options.message,
    ...(options.path ? { path: options.path } : {}),
    ...(options.nodeKind ? { nodeKind: options.nodeKind } : {}),
    source: "parser-typescript",
    evidence: {
      ...(options.detail ? { detail: options.detail } : {}),
      ...(options.sourceLocation
        ? { sourceLocation: options.sourceLocation }
        : {}),
      ...(options.evidence ?? {}),
    },
  };
}

export function typeScriptSemanticNote(options: {
  kind: SchemaSemanticNoteKind;
  code: string;
  message: string;
  path?: string[];
  nodeKind?: SchemaDiagnosticNodeKind;
  layer?: SchemaSemanticNoteLayer;
  evidence?: unknown;
}): SchemaSemanticNote {
  return createSchemaObservation({
    severity: "info",
    kind: options.kind,
    code: options.code,
    message: options.message,
    source: "parser-typescript",
    ...(options.path ? { path: options.path } : {}),
    ...(options.nodeKind ? { nodeKind: options.nodeKind } : {}),
    ...(options.layer ? { layer: options.layer } : {}),
    ...(options.evidence ? { evidence: options.evidence } : {}),
  }).semanticNote;
}

export function implicitEntrySelectedSemanticNote(options: {
  entry: string;
  selectionReason: TypeScriptImplicitEntrySelectionReason;
}): SchemaSemanticNote {
  const strategyLabels: Record<TypeScriptImplicitEntrySelectionReason, string> =
    {
      "single-declaration": "single supported declaration",
      "single-exported-declaration": "single exported supported declaration",
      "single-exported-root": "single exported root",
      "single-root": "single local root",
      "document-name-match": "document name match",
    };

  return typeScriptSemanticNote({
    kind: "policy",
    code: "typescript-implicit-entry-selected",
    message: `The TypeScript parser selected entry "${options.entry}" implicitly using the ${strategyLabels[options.selectionReason]} rule.`,
    path: ["entry", options.entry],
    nodeKind: "entry",
    layer: "shape",
    evidence: {
      entry: options.entry,
      selectionReason: options.selectionReason,
    },
  });
}
