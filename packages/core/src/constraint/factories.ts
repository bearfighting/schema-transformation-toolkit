import type {
  Constraint,
  ConstraintClause,
  ConstraintDocument,
  ConstraintEntry,
  ConstraintSeverity,
  ConstraintTarget,
  ConstraintTargetKind,
} from "./types.js";

export function constraintTarget(
  kind: ConstraintTargetKind,
  path: string[] = [],
): ConstraintTarget {
  return {
    kind,
    path,
  };
}

export function constraint(
  kind: string,
  options?: {
    severity?: Constraint["severity"];
    message?: string;
    value?: unknown;
    evidence?: Record<string, unknown>;
  },
): Constraint {
  return {
    kind,
    ...(options?.severity ? { severity: options.severity } : {}),
    ...(options?.message ? { message: options.message } : {}),
    ...(options && "value" in options ? { value: options.value } : {}),
    ...(options?.evidence ? { evidence: options.evidence } : {}),
  };
}

export function constraintEntry(
  target: ConstraintTarget,
  constraints: Constraint[],
): ConstraintEntry {
  return {
    target,
    constraints,
  };
}

export function constraintClause(
  kind: string,
  path: string[],
  message: string,
  severity: ConstraintSeverity = "info",
  evidence?: Record<string, unknown>,
): ConstraintClause {
  return constraintEntry(constraintTarget("node", path), [
    constraint(kind, {
      message,
      severity,
      ...(evidence ? { evidence } : {}),
    }),
  ]);
}

export function constraintDocument(
  name: string,
  entries: ConstraintEntry[] = [],
): ConstraintDocument {
  return {
    kind: "constraint-document",
    name,
    entries,
  };
}
