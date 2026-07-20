import {
  pushSchemaObservation,
  type SchemaDefinition,
  type SchemaDiagnostic,
  type SchemaDocument,
  type SchemaNode,
  type SchemaSemanticNote,
} from "@aio/core";

export interface TypeScriptSemanticObservations {
  diagnostics: SchemaDiagnostic[];
  semanticNotes: SchemaSemanticNote[];
}

export function collectTypeScriptSemanticObservations(
  doc: SchemaDocument,
): TypeScriptSemanticObservations {
  const diagnostics: SchemaDiagnostic[] = [];
  const semanticNotes: SchemaSemanticNote[] = [];
  const definitionLookup = new Map(
    doc.definitions.map((definition) => [definition.name.source, definition]),
  );

  for (const definition of doc.definitions) {
    collectNodeObservations(
      definition.type,
      ["definitions", definition.name.source],
      definitionLookup,
      diagnostics,
      semanticNotes,
    );
  }

  collectNodeObservations(
    doc.root,
    ["root"],
    definitionLookup,
    diagnostics,
    semanticNotes,
  );

  return {
    diagnostics,
    semanticNotes,
  };
}

function collectNodeObservations(
  node: SchemaNode,
  path: string[],
  definitionLookup: ReadonlyMap<string, SchemaDefinition>,
  diagnostics: SchemaDiagnostic[],
  semanticNotes: SchemaSemanticNote[],
): void {
  switch (node.kind) {
    case "scalar":
      if (node.scalar === "integer") {
        pushSchemaObservation(diagnostics, semanticNotes, {
          severity: "warning",
          kind: "widening",
          code: "integer-widened-to-number",
          message:
            "TypeScript output widens integer semantics to number because the target language has no distinct integer type.",
          path,
          nodeKind: "scalar",
          source: "generator-typescript",
          layer: "target",
          evidence: {
            sourceScalar: "integer",
            renderedScalar: "number",
          },
        });
      }
      return;
    case "unknown":
      pushSchemaObservation(diagnostics, semanticNotes, {
        severity: "warning",
        kind: "widening",
        code: "wide-unknown-type",
        message:
          "This schema node renders as TypeScript unknown and may accept values more broadly than the source evidence suggests.",
        path,
        nodeKind: "unknown",
        source: "generator-typescript",
        layer: "target",
        evidence: {
          reason: node.reason,
          nullable: node.nullable,
          renderedForm: node.nullable ? "unknown | null" : "unknown",
          ...(node.evidence ? { sourceEvidence: node.evidence } : {}),
        },
      });
      return;
    case "reference":
      return;
    case "array":
      collectNodeObservations(
        node.elementType,
        [...path, "elementType"],
        definitionLookup,
        diagnostics,
        semanticNotes,
      );
      return;
    case "tuple":
      for (const [index, element] of node.elements.entries()) {
        collectNodeObservations(
          element.type,
          [...path, String(index)],
          definitionLookup,
          diagnostics,
          semanticNotes,
        );
      }
      return;
    case "record":
      collectNodeObservations(
        node.key,
        [...path, "key"],
        definitionLookup,
        diagnostics,
        semanticNotes,
      );
      collectNodeObservations(
        node.value,
        [...path, "value"],
        definitionLookup,
        diagnostics,
        semanticNotes,
      );
      return;
    case "object":
      for (const field of node.fields) {
        collectNodeObservations(
          field.type,
          [...path, field.name.source],
          definitionLookup,
          diagnostics,
          semanticNotes,
        );
      }
      return;
    case "union":
      {
        const unknownMemberIndexes = node.members
          .map((member, index) =>
            resolvesToUnknownMember(member, definitionLookup, new Set())
              ? index
              : -1,
          )
          .filter((index) => index >= 0);

        if (unknownMemberIndexes.length > 0) {
          pushSchemaObservation(diagnostics, semanticNotes, {
            severity: "warning",
            kind: "widening",
            code: "unknown-union-member-absorbs-union",
            message:
              "This union includes an unknown member, so the rendered TypeScript union may accept values more broadly than the non-unknown branches suggest.",
            path,
            nodeKind: "union",
            source: "generator-typescript",
            layer: "target",
            evidence: {
              unknownMemberIndexes,
              memberKinds: node.members.map((member) => member.kind),
            },
          });
        }
      }

      for (const [index, member] of node.members.entries()) {
        collectNodeObservations(
          member,
          [...path, String(index)],
          definitionLookup,
          diagnostics,
          semanticNotes,
        );
      }
      return;
    case "literal":
    case "null":
      return;
  }
}

function resolvesToUnknownMember(
  node: SchemaNode,
  definitionLookup: ReadonlyMap<string, SchemaDefinition>,
  seenReferences: Set<string>,
): boolean {
  if (node.kind === "unknown") {
    return true;
  }

  if (node.kind !== "reference") {
    return false;
  }

  if (seenReferences.has(node.name)) {
    return false;
  }

  const definition = definitionLookup.get(node.name);

  if (definition === undefined) {
    return false;
  }

  seenReferences.add(node.name);

  return resolvesToUnknownMember(
    definition.type,
    definitionLookup,
    seenReferences,
  );
}
