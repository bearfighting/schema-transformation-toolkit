import type {
  ConstraintDocument,
  ConversionCapability,
  ConversionRouteCapabilities,
  SemanticLoss,
} from "@aio/core";
import type {
  ConversionSourceFormat,
  ConversionTargetFormat,
} from "./types.js";

export function planSemanticLosses(
  routeCapabilities: ConversionRouteCapabilities,
  constraintsArtifact: ConstraintDocument | undefined,
  targetFormat: ConversionTargetFormat,
  sourceFormat: ConversionSourceFormat,
): SemanticLoss[] {
  if (
    constraintsArtifact === undefined ||
    sourceFormat !== "json-schema" ||
    targetFormat !== "typescript"
  ) {
    return [];
  }

  const seen = new Set<string>();
  const losses: SemanticLoss[] = [];

  for (const entry of constraintsArtifact.entries) {
    for (const item of entry.constraints) {
      const lostCapability = classifyConstraintCapability(item.kind);

      if (
        !routeCapabilities.potentiallyLostCapabilities.includes(lostCapability)
      ) {
        continue;
      }

      const sourcePath = entry.target.path;
      const key = `${lostCapability}:${sourcePath.join("/")}`;

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      losses.push({
        code: "target-cannot-preserve-constraint",
        message: buildConstraintLossMessage(lostCapability, sourcePath),
        severity: "warning",
        phase: "generate",
        lostCapability,
        sourcePath,
        targetFormat,
        evidence: {
          constraintKind: item.kind,
          targetKind: entry.target.kind,
        },
      });
    }
  }

  return losses;
}

export function classifyConstraintCapability(
  constraintKind: string,
): ConversionCapability {
  if (
    constraintKind === "pattern" ||
    constraintKind === "minLength" ||
    constraintKind === "maxLength" ||
    constraintKind === "min-length" ||
    constraintKind === "max-length" ||
    constraintKind === "format"
  ) {
    return "string-constraints";
  }

  if (
    constraintKind === "minimum" ||
    constraintKind === "maximum" ||
    constraintKind === "exclusiveMinimum" ||
    constraintKind === "exclusiveMaximum" ||
    constraintKind === "multipleOf" ||
    constraintKind === "exclusive-minimum" ||
    constraintKind === "exclusive-maximum" ||
    constraintKind === "multiple-of"
  ) {
    return "numeric-constraints";
  }

  if (
    constraintKind === "minItems" ||
    constraintKind === "maxItems" ||
    constraintKind === "uniqueItems" ||
    constraintKind === "min-items" ||
    constraintKind === "max-items" ||
    constraintKind === "unique-items"
  ) {
    return "collection-constraints";
  }

  if (
    constraintKind === "closed-object" ||
    constraintKind === "minProperties" ||
    constraintKind === "maxProperties" ||
    constraintKind === "min-properties" ||
    constraintKind === "max-properties"
  ) {
    return "object-constraints";
  }

  return "portable-annotations";
}

function buildConstraintLossMessage(
  lostCapability: ConversionCapability,
  sourcePath: string[],
): string {
  const renderedPath =
    sourcePath.length > 0 ? sourcePath.join(".") : "root constraint target";

  return `TypeScript output cannot preserve ${renderLossCapability(
    lostCapability,
  )} from ${renderedPath}.`;
}

function renderLossCapability(capability: ConversionCapability): string {
  if (capability === "string-constraints") {
    return "string constraints";
  }

  if (capability === "numeric-constraints") {
    return "numeric constraints";
  }

  if (capability === "collection-constraints") {
    return "collection constraints";
  }

  if (capability === "object-constraints") {
    return "object constraints";
  }

  if (capability === "portable-annotations") {
    return "portable annotations";
  }

  if (capability === "constraint-ir") {
    return "constraint IR";
  }

  if (capability === "value-ir") {
    return "value IR";
  }

  return "shape IR";
}
