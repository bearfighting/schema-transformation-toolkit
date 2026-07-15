import {
  areEquivalentSchemaNodes,
  type SchemaDefinition,
  type SchemaDiagnostic,
  type SchemaDocument,
  type SchemaNode,
} from "@aio/core";
import type { ResolvedJsonSchemaGeneratorOptions } from "./options.js";

export function collectJsonSchemaDiagnostics(
  doc: SchemaDocument,
  options: ResolvedJsonSchemaGeneratorOptions,
): SchemaDiagnostic[] {
  const diagnostics: SchemaDiagnostic[] = [];
  const definitionLookup = new Map(
    doc.definitions.map((definition) => [definition.name.source, definition]),
  );

  for (const definition of doc.definitions) {
    collectNodeDiagnostics(
      definition.type,
      ["definitions", definition.name.source],
      options,
      definitionLookup,
      diagnostics,
    );
  }

  collectNodeDiagnostics(
    doc.root,
    ["root"],
    options,
    definitionLookup,
    diagnostics,
  );

  return diagnostics;
}

function collectNodeDiagnostics(
  node: SchemaNode,
  path: string[],
  options: ResolvedJsonSchemaGeneratorOptions,
  definitionLookup: ReadonlyMap<string, SchemaDefinition>,
  diagnostics: SchemaDiagnostic[],
): void {
  switch (node.kind) {
    case "unknown":
      diagnostics.push({
        severity: "warning",
        code: "wide-unknown-schema",
        message:
          "This schema node renders as the widest JSON Schema and may accept values more broadly than the source evidence suggests.",
        path,
        nodeKind: "unknown",
        source: "generator-json-schema",
        evidence: {
          reason: node.reason,
          nullable: node.nullable,
          renderedForm: isRootPath(path) ? "metadata-only-root" : "true-schema",
          ...(node.evidence ? { sourceEvidence: node.evidence } : {}),
        },
      });
      return;
    case "reference": {
      return;
    }
    case "array":
      collectNodeDiagnostics(
        node.elementType,
        [...path, "elementType"],
        options,
        definitionLookup,
        diagnostics,
      );
      return;
    case "tuple":
      for (const [index, element] of node.elements.entries()) {
        collectNodeDiagnostics(
          element.type,
          [...path, String(index)],
          options,
          definitionLookup,
          diagnostics,
        );
      }
      return;
    case "record":
      collectNodeDiagnostics(
        node.value,
        [...path, "value"],
        options,
        definitionLookup,
        diagnostics,
      );
      return;
    case "object":
      if (options.objectAdditionalPropertiesMode === "false") {
        diagnostics.push({
          severity: "warning",
          code: "closed-object-schema",
          message:
            "This object schema is rendering with additionalProperties: false, which may reject extra properties beyond the shared IR field set.",
          path,
          nodeKind: "object",
          source: "generator-json-schema",
          evidence: {
            objectAdditionalPropertiesMode:
              options.objectAdditionalPropertiesMode,
            fieldNames: node.fields.map((field) => field.name.source),
          },
        });
      }

      for (const field of node.fields) {
        collectNodeDiagnostics(
          field.type,
          [...path, field.name.source],
          options,
          definitionLookup,
          diagnostics,
        );
      }
      return;
    case "union": {
      const overlappingPairs = findOverlappingUnionPairs(
        node.members,
        definitionLookup,
      );

      if (overlappingPairs.length > 0) {
        if (options.unionComposition === "oneOf") {
          diagnostics.push({
            severity: "warning",
            code: "overlapping-oneof-members",
            message:
              "This union is rendering with oneOf, but some member branches may overlap under JSON Schema semantics.",
            path,
            nodeKind: "union",
            source: "generator-json-schema",
            evidence: {
              unionComposition: options.unionComposition,
              overlappingPairs,
              memberKinds: describeOverlappingPairs(
                node.members,
                overlappingPairs,
              ),
            },
          });
        } else {
          diagnostics.push({
            severity: "warning",
            code: "overlapping-anyof-members",
            message:
              "This union is rendering with anyOf, so overlapping member branches may be accepted without exclusivity under JSON Schema semantics.",
            path,
            nodeKind: "union",
            source: "generator-json-schema",
            evidence: {
              unionComposition: options.unionComposition,
              overlappingPairs,
              memberKinds: describeOverlappingPairs(
                node.members,
                overlappingPairs,
              ),
            },
          });
        }
      }

      for (const [index, member] of node.members.entries()) {
        collectNodeDiagnostics(
          member,
          [...path, String(index)],
          options,
          definitionLookup,
          diagnostics,
        );
      }
      return;
    }
    case "scalar":
    case "literal":
    case "null":
      return;
  }
}

function findOverlappingUnionPairs(
  members: SchemaNode[],
  definitionLookup: ReadonlyMap<string, SchemaDefinition>,
): Array<{ left: number; right: number }> {
  const overlappingPairs: Array<{ left: number; right: number }> = [];

  for (let left = 0; left < members.length; left += 1) {
    for (let right = left + 1; right < members.length; right += 1) {
      const leftMember = members[left];
      const rightMember = members[right];

      if (leftMember === undefined || rightMember === undefined) {
        continue;
      }

      if (mayOverlap(leftMember, rightMember, definitionLookup, new Set())) {
        overlappingPairs.push({ left, right });
      }
    }
  }

  return overlappingPairs;
}

function mayOverlap(
  left: SchemaNode,
  right: SchemaNode,
  definitionLookup: ReadonlyMap<string, SchemaDefinition>,
  seenReferencePairs: Set<string>,
): boolean {
  if (areEquivalentSchemaNodes(left, right)) {
    return true;
  }

  if (left.kind === "reference") {
    const resolvedLeft = definitionLookup.get(left.name);

    if (resolvedLeft !== undefined) {
      const key = `${left.name}::${serializeNode(right)}`;

      if (!seenReferencePairs.has(key)) {
        seenReferencePairs.add(key);
        return mayOverlap(
          resolvedLeft.type,
          right,
          definitionLookup,
          seenReferencePairs,
        );
      }
    }
  }

  if (right.kind === "reference") {
    const resolvedRight = definitionLookup.get(right.name);

    if (resolvedRight !== undefined) {
      const key = `${serializeNode(left)}::${right.name}`;

      if (!seenReferencePairs.has(key)) {
        seenReferencePairs.add(key);
        return mayOverlap(
          left,
          resolvedRight.type,
          definitionLookup,
          seenReferencePairs,
        );
      }
    }
  }

  if (left.kind === "union") {
    return left.members.some((member) =>
      mayOverlap(member, right, definitionLookup, seenReferencePairs),
    );
  }

  if (right.kind === "union") {
    return right.members.some((member) =>
      mayOverlap(left, member, definitionLookup, seenReferencePairs),
    );
  }

  if (left.kind === "unknown" || right.kind === "unknown") {
    return true;
  }

  if (left.kind === "scalar" && right.kind === "scalar") {
    return (
      left.scalar === right.scalar ||
      (left.scalar === "integer" && right.scalar === "number") ||
      (left.scalar === "number" && right.scalar === "integer")
    );
  }

  if (left.kind === "scalar" && right.kind === "literal") {
    return literalMatchesScalar(right.value, left.scalar);
  }

  if (left.kind === "literal" && right.kind === "scalar") {
    return literalMatchesScalar(left.value, right.scalar);
  }

  if (left.kind === "object" && right.kind === "object") {
    return true;
  }

  if (left.kind === "array" && right.kind === "array") {
    return true;
  }

  if (
    (left.kind === "record" && right.kind === "record") ||
    (left.kind === "record" && right.kind === "object") ||
    (left.kind === "object" && right.kind === "record")
  ) {
    return true;
  }

  return false;
}

function literalMatchesScalar(
  value: string | number | boolean,
  scalar: "string" | "integer" | "number" | "boolean",
): boolean {
  switch (scalar) {
    case "string":
      return typeof value === "string";
    case "boolean":
      return typeof value === "boolean";
    case "integer":
      return typeof value === "number" && Number.isInteger(value);
    case "number":
      return typeof value === "number";
  }
}

function serializeNode(node: SchemaNode): string {
  return node.kind === "reference" ? `reference:${node.name}` : node.kind;
}

function describeOverlappingPairs(
  members: SchemaNode[],
  overlappingPairs: Array<{ left: number; right: number }>,
): Array<{
  left: number;
  right: number;
  leftKind: string;
  rightKind: string;
}> {
  return overlappingPairs.flatMap((pair) => {
    const left = members[pair.left];
    const right = members[pair.right];

    if (left === undefined || right === undefined) {
      return [];
    }

    return [
      {
        left: pair.left,
        right: pair.right,
        leftKind: serializeNode(left),
        rightKind: serializeNode(right),
      },
    ];
  });
}

function isRootPath(path: string[]): boolean {
  return path.length === 1 && path[0] === "root";
}
