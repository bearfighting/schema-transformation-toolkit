export function wideUnknownSchemaDiagnostic(
  path: string[],
  evidence: Record<string, unknown>,
) {
  return {
    severity: "warning" as const,
    code: "wide-unknown-schema",
    message:
      "This schema node renders as the widest JSON Schema and may accept values more broadly than the source evidence suggests.",
    path,
    nodeKind: "unknown" as const,
    source: "generator-json-schema",
    evidence,
  };
}

export function wideUnknownSchemaSemanticNote(
  path: string[],
  evidence: Record<string, unknown>,
) {
  return {
    kind: "widening" as const,
    code: "wide-unknown-schema",
    message:
      "This schema node renders as the widest JSON Schema and may accept values more broadly than the source evidence suggests.",
    path,
    nodeKind: "unknown" as const,
    source: "generator-json-schema",
    layer: "shape" as const,
    evidence,
  };
}

export function overlappingUnionPolicyDiagnostic(
  code: "overlapping-oneof-members" | "overlapping-anyof-members",
  path: string[],
  evidence: Record<string, unknown>,
) {
  return {
    severity: "warning" as const,
    code,
    message:
      code === "overlapping-oneof-members"
        ? "This union is rendering with oneOf, but some member branches may overlap under JSON Schema semantics."
        : "This union is rendering with anyOf, so overlapping member branches may be accepted without exclusivity under JSON Schema semantics.",
    path,
    nodeKind: "union" as const,
    source: "generator-json-schema",
    evidence,
  };
}

export function overlappingUnionPolicySemanticNote(
  code: "overlapping-oneof-members" | "overlapping-anyof-members",
  path: string[],
  evidence: Record<string, unknown>,
) {
  return {
    kind: "policy" as const,
    code,
    message:
      code === "overlapping-oneof-members"
        ? "This union is rendering with oneOf, but some member branches may overlap under JSON Schema semantics."
        : "This union is rendering with anyOf, so overlapping member branches may be accepted without exclusivity under JSON Schema semantics.",
    path,
    nodeKind: "union" as const,
    source: "generator-json-schema",
    layer: "target" as const,
    evidence,
  };
}

export function closedObjectSchemaDiagnostic(
  path: string[],
  evidence: Record<string, unknown>,
) {
  return {
    severity: "warning" as const,
    code: "closed-object-schema",
    message:
      "This object schema is rendering with additionalProperties: false, which may reject extra properties beyond the shared IR field set.",
    path,
    nodeKind: "object" as const,
    source: "generator-json-schema",
    evidence,
  };
}

export function closedObjectSchemaSemanticNote(
  path: string[],
  evidence: Record<string, unknown>,
) {
  return {
    kind: "policy" as const,
    code: "closed-object-schema",
    message:
      "This object schema is rendering with additionalProperties: false, which may reject extra properties beyond the shared IR field set.",
    path,
    nodeKind: "object" as const,
    source: "generator-json-schema",
    layer: "target" as const,
    evidence,
  };
}
