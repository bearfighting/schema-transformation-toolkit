import type {
  SchemaDiagnostic,
  SchemaDiagnosticNodeKind,
  SchemaDiagnosticSeverity,
  SchemaSemanticNote,
  SchemaSemanticNoteKind,
  SchemaSemanticNoteLayer,
} from "../schema/types.js";

export interface SchemaObservationOptions {
  severity: SchemaDiagnosticSeverity;
  kind: SchemaSemanticNoteKind;
  code: string;
  message: string;
  source: string;
  path?: string[];
  nodeKind?: SchemaDiagnosticNodeKind;
  layer?: SchemaSemanticNoteLayer;
  evidence?: unknown;
}

export interface SchemaObservationPair {
  diagnostic: SchemaDiagnostic;
  semanticNote: SchemaSemanticNote;
}

export function createSchemaObservation(
  options: SchemaObservationOptions,
): SchemaObservationPair {
  return {
    diagnostic: {
      severity: options.severity,
      code: options.code,
      message: options.message,
      ...(options.path ? { path: options.path } : {}),
      ...(options.nodeKind ? { nodeKind: options.nodeKind } : {}),
      source: options.source,
      ...(options.evidence ? { evidence: options.evidence } : {}),
    },
    semanticNote: {
      kind: options.kind,
      code: options.code,
      message: options.message,
      ...(options.path ? { path: options.path } : {}),
      ...(options.nodeKind ? { nodeKind: options.nodeKind } : {}),
      source: options.source,
      ...(options.layer ? { layer: options.layer } : {}),
      ...(options.evidence ? { evidence: options.evidence } : {}),
    },
  };
}

export function pushSchemaObservation(
  diagnostics: SchemaDiagnostic[],
  semanticNotes: SchemaSemanticNote[],
  options: SchemaObservationOptions,
): void {
  const observation = createSchemaObservation(options);
  diagnostics.push(observation.diagnostic);
  semanticNotes.push(observation.semanticNote);
}
