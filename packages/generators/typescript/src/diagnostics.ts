import { pushSchemaObservation, walkSchemaDocument } from "@aio/core";
import type {
  SchemaDefinition,
  SchemaDiagnostic,
  SchemaDocument,
  SchemaNode,
  SchemaSemanticNote,
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

  walkSchemaDocument(
    doc,
    {
      enter(context) {
        switch (context.node.kind) {
          case "scalar":
            if (context.node.scalar === "integer") {
              pushSchemaObservation(diagnostics, semanticNotes, {
                severity: "warning",
                kind: "widening",
                code: "integer-widened-to-number",
                message:
                  "TypeScript output widens integer semantics to number because the target language has no distinct integer type.",
                path: context.path,
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
              path: context.path,
              nodeKind: "unknown",
              source: "generator-typescript",
              layer: "target",
              evidence: {
                reason: context.node.reason,
                nullable: context.node.nullable,
                renderedForm: context.node.nullable
                  ? "unknown | null"
                  : "unknown",
                ...(context.node.evidence
                  ? { sourceEvidence: context.node.evidence }
                  : {}),
              },
            });
            return;
          case "union": {
            const unknownMemberIndexes = context.node.members
              .map((member, index) =>
                resolvesToUnknownMember(
                  member,
                  context.definitionLookup,
                  new Set(),
                )
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
                path: context.path,
                nodeKind: "union",
                source: "generator-typescript",
                layer: "target",
                evidence: {
                  unknownMemberIndexes,
                  memberKinds: context.node.members.map(
                    (member) => member.kind,
                  ),
                },
              });
            }
            return;
          }
          case "literal":
          case "null":
          case "reference":
          case "array":
          case "tuple":
          case "record":
          case "object":
            return;
        }
      },
    },
    { references: "preserve" },
  );

  return {
    diagnostics,
    semanticNotes,
  };
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
