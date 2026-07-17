import type {
  Constraint,
  ConstraintClause,
  ConstraintDocument,
  ConstraintEntry,
  ConstraintTarget,
} from "./types.js";

export function isConstraintTarget(value: unknown): value is ConstraintTarget {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    "path" in value
  );
}

export function isConstraint(value: unknown): value is Constraint {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    typeof (value as { kind?: unknown }).kind === "string"
  );
}

export function isConstraintEntry(value: unknown): value is ConstraintEntry {
  return (
    typeof value === "object" &&
    value !== null &&
    "target" in value &&
    "constraints" in value
  );
}

export function isConstraintClause(value: unknown): value is ConstraintClause {
  return isConstraintEntry(value);
}

export function isConstraintDocument(
  value: unknown,
): value is ConstraintDocument {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    (value as { kind?: unknown }).kind === "constraint-document" &&
    "name" in value &&
    "entries" in value
  );
}
