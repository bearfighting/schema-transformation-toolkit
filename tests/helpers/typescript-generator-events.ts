export function integerWideningDiagnostic(path: string[]) {
  return {
    severity: "warning" as const,
    code: "integer-widened-to-number",
    message:
      "TypeScript output widens integer semantics to number because the target language has no distinct integer type.",
    path,
    nodeKind: "scalar" as const,
    source: "generator-typescript",
    evidence: {
      sourceScalar: "integer",
      renderedScalar: "number",
    },
  };
}

export function integerWideningSemanticNote(path: string[]) {
  return {
    kind: "widening" as const,
    code: "integer-widened-to-number",
    message:
      "TypeScript output widens integer semantics to number because the target language has no distinct integer type.",
    path,
    nodeKind: "scalar" as const,
    source: "generator-typescript",
    layer: "target" as const,
    evidence: {
      sourceScalar: "integer",
      renderedScalar: "number",
    },
  };
}

export function unknownWideningDiagnostic(
  path: string[],
  options: {
    reason: string;
    nullable: boolean;
    renderedForm: string;
    sourceEvidence?: Record<string, unknown>;
  },
) {
  return {
    severity: "warning" as const,
    code: "wide-unknown-type",
    message:
      "This schema node renders as TypeScript unknown and may accept values more broadly than the source evidence suggests.",
    path,
    nodeKind: "unknown" as const,
    source: "generator-typescript",
    evidence: {
      reason: options.reason,
      nullable: options.nullable,
      renderedForm: options.renderedForm,
      ...(options.sourceEvidence
        ? { sourceEvidence: options.sourceEvidence }
        : {}),
    },
  };
}

export function unknownWideningSemanticNote(
  path: string[],
  options: {
    reason: string;
    nullable: boolean;
    renderedForm: string;
    sourceEvidence?: Record<string, unknown>;
  },
) {
  return {
    kind: "widening" as const,
    code: "wide-unknown-type",
    message:
      "This schema node renders as TypeScript unknown and may accept values more broadly than the source evidence suggests.",
    path,
    nodeKind: "unknown" as const,
    source: "generator-typescript",
    layer: "target" as const,
    evidence: {
      reason: options.reason,
      nullable: options.nullable,
      renderedForm: options.renderedForm,
      ...(options.sourceEvidence
        ? { sourceEvidence: options.sourceEvidence }
        : {}),
    },
  };
}

export function unknownUnionWideningDiagnostic(
  path: string[],
  unknownMemberIndexes: number[],
  memberKinds: string[] = ["literal", "unknown"],
) {
  return {
    severity: "warning" as const,
    code: "unknown-union-member-absorbs-union",
    message:
      "This union includes an unknown member, so the rendered TypeScript union may accept values more broadly than the non-unknown branches suggest.",
    path,
    nodeKind: "union" as const,
    source: "generator-typescript",
    evidence: {
      unknownMemberIndexes,
      memberKinds,
    },
  };
}

export function unknownUnionWideningSemanticNote(
  path: string[],
  unknownMemberIndexes: number[],
  memberKinds: string[] = ["literal", "unknown"],
) {
  return {
    kind: "widening" as const,
    code: "unknown-union-member-absorbs-union",
    message:
      "This union includes an unknown member, so the rendered TypeScript union may accept values more broadly than the non-unknown branches suggest.",
    path,
    nodeKind: "union" as const,
    source: "generator-typescript",
    layer: "target" as const,
    evidence: {
      unknownMemberIndexes,
      memberKinds,
    },
  };
}
