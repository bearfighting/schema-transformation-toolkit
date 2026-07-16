import type {
  SchemaDiagnostic,
  SchemaDiagnosticNodeKind,
  SchemaDiagnosticSeverity,
} from "@aio/core";

export function jsonSchemaDiagnostic(options: {
  severity: SchemaDiagnosticSeverity;
  code: string;
  message: string;
  path?: string[];
  nodeKind?: SchemaDiagnosticNodeKind;
  evidence?: unknown;
}): SchemaDiagnostic {
  return {
    severity: options.severity,
    code: options.code,
    message: options.message,
    ...(options.path ? { path: options.path } : {}),
    ...(options.nodeKind ? { nodeKind: options.nodeKind } : {}),
    source: "parser-json-schema",
    ...(options.evidence ? { evidence: options.evidence } : {}),
  };
}
