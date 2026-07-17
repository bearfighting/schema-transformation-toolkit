export type ConstraintSeverity = "info" | "warning" | "error";

export type ConstraintTargetKind =
  "document" | "root" | "definition" | "field" | "node";

export interface ConstraintTarget {
  kind: ConstraintTargetKind;
  path: string[];
}

export interface Constraint {
  kind: string;
  severity?: ConstraintSeverity;
  message?: string;
  value?: unknown;
  evidence?: Record<string, unknown>;
}

export interface ConstraintEntry {
  target: ConstraintTarget;
  constraints: Constraint[];
}

export type ConstraintClause = ConstraintEntry;

export interface ConstraintDocument {
  kind: "constraint-document";
  name: string;
  entries: ConstraintEntry[];
}
