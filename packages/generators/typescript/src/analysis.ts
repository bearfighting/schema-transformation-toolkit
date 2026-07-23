import {
  walkSchemaDocumentFromRoot,
  type SchemaDefinition,
  type SchemaDocument,
  type SchemaNode,
} from "@aio/core";

export type TypeScriptLossHotspotCode =
  "integer-widening" | "wide-unknown" | "unknown-union-absorption";

export interface TypeScriptLossHotspot {
  code: TypeScriptLossHotspotCode;
  path: string[];
  lexicalDefinitionName?: string;
  containingDefinitionName?: string;
  referenceStack: string[];
  evidence: Record<string, unknown>;
}

export type TypeScriptSchemaFeature =
  | "object"
  | "array"
  | "tuple"
  | "record"
  | "union"
  | "optional-field"
  | "nullable-field"
  | "local-reference"
  | "recursive-reference";

export interface TypeScriptCapabilityRequirement {
  feature: TypeScriptSchemaFeature;
  path: string[];
  lexicalDefinitionName?: string;
  containingDefinitionName?: string;
  referenceStack: string[];
  evidence?: Record<string, unknown>;
}

export function collectTypeScriptTargetLossHotspots(
  document: SchemaDocument,
): TypeScriptLossHotspot[] {
  const hotspots: TypeScriptLossHotspot[] = [];

  walkSchemaDocumentFromRoot(
    document,
    {
      enter(context) {
        switch (context.node.kind) {
          case "scalar":
            if (context.node.scalar === "integer") {
              hotspots.push(
                createLossHotspot(context, "integer-widening", {
                  sourceScalar: "integer",
                  renderedScalar: "number",
                }),
              );
            }
            return;
          case "unknown":
            hotspots.push(
              createLossHotspot(context, "wide-unknown", {
                reason: context.node.reason,
                nullable: context.node.nullable,
                renderedForm: context.node.nullable
                  ? "unknown | null"
                  : "unknown",
                ...(context.node.evidence
                  ? { sourceEvidence: context.node.evidence }
                  : {}),
              }),
            );
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
              hotspots.push(
                createLossHotspot(context, "unknown-union-absorption", {
                  unknownMemberIndexes,
                  memberKinds: context.node.members.map(
                    (member) => member.kind,
                  ),
                }),
              );
            }
            return;
          }
          case "reference":
          case "literal":
          case "null":
          case "array":
          case "tuple":
          case "record":
          case "object":
            return;
        }
      },
    },
    { references: "follow", referenceVisits: "per-occurrence" },
  );

  return hotspots;
}

export function collectTypeScriptCapabilityRequirements(
  document: SchemaDocument,
): TypeScriptCapabilityRequirement[] {
  const requirements: TypeScriptCapabilityRequirement[] = [];

  walkSchemaDocumentFromRoot(
    document,
    {
      enter(context) {
        switch (context.node.kind) {
          case "reference":
            if (context.referenceResolution?.status === "resolved") {
              requirements.push(
                createCapabilityRequirement(context, "local-reference", {
                  targetDefinition:
                    context.referenceResolution.definition.name.source,
                }),
              );
            }

            if (context.referenceResolution?.status === "cycle") {
              requirements.push(
                createCapabilityRequirement(context, "recursive-reference", {
                  referenceName: context.referenceResolution.name,
                }),
              );
            }
            return;
          case "object":
          case "array":
          case "tuple":
          case "record":
          case "union":
            requirements.push(
              createCapabilityRequirement(context, context.node.kind),
            );
            return;
          case "scalar":
          case "literal":
          case "null":
          case "unknown":
            return;
        }
      },
      enterField(context) {
        if (!context.field.required) {
          requirements.push(
            createCapabilityRequirement(context, "optional-field", {
              fieldName: context.field.name.source,
            }),
          );
        }

        if (context.field.nullable) {
          requirements.push(
            createCapabilityRequirement(context, "nullable-field", {
              fieldName: context.field.name.source,
            }),
          );
        }
      },
    },
    { references: "follow", referenceVisits: "once-per-definition" },
  );

  return requirements;
}

function createLossHotspot(
  context: {
    path: string[];
    lexicalDefinition?: SchemaDefinition;
    containingDefinition?: SchemaDefinition;
    referenceStack: readonly { targetDefinition: SchemaDefinition }[];
  },
  code: TypeScriptLossHotspotCode,
  evidence: Record<string, unknown>,
): TypeScriptLossHotspot {
  return {
    code,
    path: [...context.path],
    ...(context.lexicalDefinition
      ? { lexicalDefinitionName: context.lexicalDefinition.name.source }
      : {}),
    ...(context.containingDefinition
      ? {
          containingDefinitionName: context.containingDefinition.name.source,
        }
      : {}),
    referenceStack: context.referenceStack.map(
      (frame) => frame.targetDefinition.name.source,
    ),
    evidence,
  };
}

function createCapabilityRequirement(
  context: {
    path: string[];
    lexicalDefinition?: SchemaDefinition;
    containingDefinition?: SchemaDefinition;
    referenceStack: readonly { targetDefinition: SchemaDefinition }[];
  },
  feature: TypeScriptSchemaFeature,
  evidence?: Record<string, unknown>,
): TypeScriptCapabilityRequirement {
  return {
    feature,
    path: [...context.path],
    ...(context.lexicalDefinition
      ? { lexicalDefinitionName: context.lexicalDefinition.name.source }
      : {}),
    ...(context.containingDefinition
      ? {
          containingDefinitionName: context.containingDefinition.name.source,
        }
      : {}),
    referenceStack: context.referenceStack.map(
      (frame) => frame.targetDefinition.name.source,
    ),
    ...(evidence ? { evidence } : {}),
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
