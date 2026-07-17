import type {
  SchemaDiagnostic,
  SchemaDiagnosticNodeKind,
  SchemaDiagnosticSeverity,
  SchemaSemanticNote,
  SchemaSemanticNoteKind,
  SchemaSemanticNoteLayer,
} from "@aio/core";
import { createSchemaObservation as createObservation } from "@aio/core";

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

export function jsonSchemaSemanticNote(options: {
  kind: SchemaSemanticNoteKind;
  code: string;
  message: string;
  path?: string[];
  nodeKind?: SchemaDiagnosticNodeKind;
  layer?: SchemaSemanticNoteLayer;
  evidence?: unknown;
}): SchemaSemanticNote {
  return {
    kind: options.kind,
    code: options.code,
    message: options.message,
    ...(options.path ? { path: options.path } : {}),
    ...(options.nodeKind ? { nodeKind: options.nodeKind } : {}),
    source: "parser-json-schema",
    ...(options.layer ? { layer: options.layer } : {}),
    ...(options.evidence ? { evidence: options.evidence } : {}),
  };
}

export function jsonSchemaObservation(options: {
  severity: SchemaDiagnosticSeverity;
  kind: SchemaSemanticNoteKind;
  code: string;
  message: string;
  path?: string[];
  nodeKind?: SchemaDiagnosticNodeKind;
  layer?: SchemaSemanticNoteLayer;
  evidence?: unknown;
}): { diagnostic: SchemaDiagnostic; semanticNote: SchemaSemanticNote } {
  return createObservation({
    severity: options.severity,
    kind: options.kind,
    code: options.code,
    message: options.message,
    source: "parser-json-schema",
    ...(options.path ? { path: options.path } : {}),
    ...(options.nodeKind ? { nodeKind: options.nodeKind } : {}),
    ...(options.layer ? { layer: options.layer } : {}),
    ...(options.evidence ? { evidence: options.evidence } : {}),
  });
}
