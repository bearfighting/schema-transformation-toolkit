import type { SchemaDiagnostic } from "@aio/core";
import type { TypeScriptInferenceErrorCode } from "./errors.js";
import type { TypeScriptSourceLocation } from "./types.js";

export function missingEntryNameDiagnostic(
  sourceLocation?: TypeScriptSourceLocation,
): SchemaDiagnostic {
  return {
    severity: "error",
    code: "missing-typescript-entry",
    message:
      "TypeScript parser v0 requires an explicit entry declaration name.",
    path: ["entry"],
    source: "parser-typescript",
    ...(sourceLocation
      ? {
          evidence: {
            sourceLocation,
          },
        }
      : {}),
  };
}

export function missingEntryDeclarationDiagnostic(
  entry: string,
  sourceLocation?: TypeScriptSourceLocation,
): SchemaDiagnostic {
  return {
    severity: "error",
    code: "missing-typescript-entry-declaration",
    message: `The TypeScript parser could not find a supported declaration named "${entry}".`,
    path: ["entry", entry],
    source: "parser-typescript",
    evidence: {
      entry,
      ...(sourceLocation ? { sourceLocation } : {}),
    },
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

export function createTypeScriptUnsupportedDiagnostic(options: {
  code: TypeScriptInferenceErrorCode;
  message: string;
  detail?: string;
  path?: string[];
  nodeKind?: string;
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
