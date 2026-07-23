import type {
  ConversionSemanticCaveat,
  SchemaDiagnostic,
  SemanticLoss,
} from "@aio/core";
import type { ConvertFailureResult, ConvertResult } from "./types.js";

export interface UserFacingSourcePosition {
  offset: number;
  line: number;
  column: number;
}

export interface UserFacingSourceRange {
  start: UserFacingSourcePosition;
  end: UserFacingSourcePosition;
  length?: number;
}

export interface UserFacingDiagnostic {
  severity: "error" | "warning" | "info";
  code: string;
  title: string;
  message: string;
  path?: string;
  source?: string;
  sourceRange?: UserFacingSourceRange;
  suggestion?: string;
  technicalDetails?: unknown;
}

export function collectUserFacingDiagnostics(
  result: ConvertResult,
): UserFacingDiagnostic[] {
  if (!result.ok) {
    return [
      normalizeFailureResult(result),
      ...(result.diagnostics ?? []).map(normalizeSchemaDiagnostic),
    ];
  }

  return [
    ...(result.diagnostics ?? []).map(normalizeSchemaDiagnostic),
    ...(result.report?.semanticCaveats ?? []).map(normalizeSemanticCaveat),
    ...(result.losses ?? []).map(normalizeSemanticLoss),
  ];
}

function normalizeFailureResult(
  result: ConvertFailureResult,
): UserFacingDiagnostic {
  const suggestion = suggestionFromFailurePhase(result.phase);

  return {
    severity: "error",
    code: result.code,
    title: titleFromCode(result.code),
    message: result.message,
    source: "sdk",
    ...(suggestion ? { suggestion } : {}),
    technicalDetails: {
      phase: result.phase,
      plan: result.plan,
    },
  };
}

function normalizeSchemaDiagnostic(
  diagnostic: SchemaDiagnostic,
): UserFacingDiagnostic {
  const sourceRange = extractSourceRange(diagnostic.evidence);
  const suggestion = suggestionFromCode(diagnostic.code);

  return {
    severity: diagnostic.severity,
    code: diagnostic.code,
    title: titleFromCode(diagnostic.code),
    message: diagnostic.message,
    ...(diagnostic.path ? { path: diagnostic.path.join(".") } : {}),
    ...(diagnostic.source ? { source: diagnostic.source } : {}),
    ...(sourceRange ? { sourceRange } : {}),
    ...(suggestion ? { suggestion } : {}),
    ...(diagnostic.evidence ? { technicalDetails: diagnostic.evidence } : {}),
  };
}

function normalizeSemanticCaveat(
  caveat: ConversionSemanticCaveat,
): UserFacingDiagnostic {
  const suggestion = suggestionFromCode(caveat.code);

  return {
    severity: "warning",
    code: caveat.code,
    title: titleFromCode(caveat.code),
    message: caveat.message,
    ...(caveat.path ? { path: caveat.path.join(".") } : {}),
    ...(caveat.source ? { source: caveat.source } : {}),
    ...(suggestion ? { suggestion } : {}),
    technicalDetails: {
      phase: caveat.phase,
      kind: caveat.kind,
      ...(caveat.layer ? { layer: caveat.layer } : {}),
      ...(caveat.evidence ? { evidence: caveat.evidence } : {}),
    },
  };
}

function normalizeSemanticLoss(loss: SemanticLoss): UserFacingDiagnostic {
  const suggestion = suggestionFromCode(loss.code);

  return {
    severity: loss.severity,
    code: loss.code,
    title: titleFromCode(loss.code),
    message: loss.message,
    ...(loss.sourcePath ? { path: loss.sourcePath.join(".") } : {}),
    ...(suggestion ? { suggestion } : {}),
    technicalDetails: {
      phase: loss.phase,
      lostCapability: loss.lostCapability,
      ...(loss.targetFormat ? { targetFormat: loss.targetFormat } : {}),
      ...(loss.evidence ? { evidence: loss.evidence } : {}),
    },
  };
}

function titleFromCode(code: string): string {
  return code
    .split("-")
    .filter((part) => part.length > 0)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function suggestionFromFailurePhase(
  phase: ConvertFailureResult["phase"],
): string | undefined {
  if (phase === "parse") {
    return "Check whether the source input fits the currently supported subset for the selected source format.";
  }

  if (phase === "generate") {
    return "Check whether the selected target format can preserve the inferred shared semantics for this route.";
  }

  return undefined;
}

function suggestionFromCode(code: string): string | undefined {
  if (code === "unsupported-typescript-syntax") {
    return "Rewrite the input to the current schema-oriented TypeScript subset.";
  }

  if (code === "integer-widened-to-number") {
    return "Treat the generated TypeScript type as semantically wider than a distinct integer type.";
  }

  if (code === "wide-unknown-type") {
    return "Review the source evidence because this output accepts values more broadly than a narrower source-specific shape.";
  }

  if (code === "unknown-union-member-absorbs-union") {
    return "Inspect the unknown branch because it may dominate narrower union members in the target.";
  }

  if (code === "target-cannot-preserve-constraint") {
    return "Inspect the route capability loss because the target cannot preserve one or more source constraints exactly.";
  }

  return undefined;
}

function extractSourceRange(
  evidence: unknown,
): UserFacingSourceRange | undefined {
  if (
    !evidence ||
    typeof evidence !== "object" ||
    Array.isArray(evidence) ||
    !("sourceLocation" in evidence)
  ) {
    return undefined;
  }

  const sourceLocation = evidence.sourceLocation;

  if (
    !sourceLocation ||
    typeof sourceLocation !== "object" ||
    Array.isArray(sourceLocation) ||
    !("start" in sourceLocation) ||
    !("end" in sourceLocation)
  ) {
    return undefined;
  }

  const start = parseSourcePosition(sourceLocation.start);
  const end = parseSourcePosition(sourceLocation.end);

  if (!start || !end) {
    return undefined;
  }

  return {
    start,
    end,
    ...("length" in sourceLocation &&
    typeof sourceLocation.length === "number" &&
    Number.isFinite(sourceLocation.length)
      ? { length: sourceLocation.length }
      : {}),
  };
}

function parseSourcePosition(
  value: unknown,
): UserFacingSourcePosition | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  if (
    !("offset" in value) ||
    !("line" in value) ||
    !("column" in value) ||
    typeof value.offset !== "number" ||
    typeof value.line !== "number" ||
    typeof value.column !== "number"
  ) {
    return undefined;
  }

  return {
    offset: value.offset,
    line: value.line,
    column: value.column,
  };
}
