import { mapSchemaNodeChildren, type SchemaNodeChild } from "./children.js";
import type { SchemaDefinition, SchemaDocument, SchemaNode } from "./types.js";
import { walkSchemaDocumentFromRoot } from "./traversal.js";
import type { SchemaWalkVia } from "./traversal.js";

export type SchemaTransformReferenceMode = "preserve" | "follow";

export interface SchemaTransformContext {
  path: string[];
  definitionLookup: ReadonlyMap<string, SchemaDefinition>;
  parent?: SchemaNode;
  containingDefinition?: SchemaDefinition;
  via?: SchemaWalkVia;
}

export interface SchemaTransformOptions {
  references?: SchemaTransformReferenceMode;
}

export interface SchemaTransformer {
  transformNode?(node: SchemaNode, context: SchemaTransformContext): SchemaNode;
}

export function transformSchemaDocument(
  document: SchemaDocument,
  transformer: SchemaTransformer,
  options?: SchemaTransformOptions,
): SchemaDocument {
  return transformSchemaDocumentStructure(document, transformer, options);
}

export function transformSchemaDocumentStructure(
  document: SchemaDocument,
  transformer: SchemaTransformer,
  _options?: SchemaTransformOptions,
): SchemaDocument {
  const definitionLookup = createDefinitionLookup(document.definitions);

  let definitionsChanged = false;
  const nextDefinitions = document.definitions.map((definition) => {
    const nextType = transformSchemaNode(definition.type, transformer, {
      path: ["definitions", definition.name.source],
      definitionLookup,
      containingDefinition: definition,
      via: {
        kind: "definition",
        definitionName: definition.name.source,
      },
    });

    if (nextType === definition.type) {
      return definition;
    }

    definitionsChanged = true;
    return {
      name: definition.name,
      type: nextType,
    };
  });

  const nextRoot = transformSchemaNode(document.root, transformer, {
    path: ["root"],
    definitionLookup,
    via: { kind: "root" },
  });

  return definitionsChanged || nextRoot !== document.root
    ? {
        version: document.version,
        kind: document.kind,
        name: document.name,
        definitions: nextDefinitions,
        root: nextRoot,
      }
    : document;
}

export function transformSchemaDocumentFromRoot(
  document: SchemaDocument,
  transformer: SchemaTransformer,
  options?: SchemaTransformOptions,
): SchemaDocument {
  const definitionLookup = createDefinitionLookup(document.definitions);
  const reachableDefinitions =
    options?.references === "follow"
      ? collectReachableDefinitionNames(document)
      : undefined;
  const nextRoot = transformSchemaNode(document.root, transformer, {
    path: ["root"],
    definitionLookup,
    via: { kind: "root" },
  });

  let definitionsChanged = false;
  const nextDefinitions =
    reachableDefinitions === undefined
      ? document.definitions
      : document.definitions.map((definition) => {
          if (!reachableDefinitions.has(definition.name.source)) {
            return definition;
          }

          const nextType = transformSchemaNode(definition.type, transformer, {
            path: ["definitions", definition.name.source],
            definitionLookup,
            containingDefinition: definition,
            via: {
              kind: "definition",
              definitionName: definition.name.source,
            },
          });

          if (nextType === definition.type) {
            return definition;
          }

          definitionsChanged = true;
          return {
            name: definition.name,
            type: nextType,
          };
        });

  return nextRoot === document.root && !definitionsChanged
    ? document
    : {
        version: document.version,
        kind: document.kind,
        name: document.name,
        definitions: nextDefinitions,
        root: nextRoot,
      };
}

export function transformSchemaDefinitions(
  document: SchemaDocument,
  transformer: SchemaTransformer,
  _options?: SchemaTransformOptions,
): SchemaDocument {
  const definitionLookup = createDefinitionLookup(document.definitions);

  let definitionsChanged = false;
  const nextDefinitions = document.definitions.map((definition) => {
    const nextType = transformSchemaNode(definition.type, transformer, {
      path: ["definitions", definition.name.source],
      definitionLookup,
      containingDefinition: definition,
      via: {
        kind: "definition",
        definitionName: definition.name.source,
      },
    });

    if (nextType === definition.type) {
      return definition;
    }

    definitionsChanged = true;
    return {
      name: definition.name,
      type: nextType,
    };
  });

  return definitionsChanged
    ? {
        version: document.version,
        kind: document.kind,
        name: document.name,
        definitions: nextDefinitions,
        root: document.root,
      }
    : document;
}

export function transformSchemaNode(
  node: SchemaNode,
  transformer: SchemaTransformer,
  context: SchemaTransformContext,
): SchemaNode {
  const transformedChildren = mapSchemaNodeChildren(
    node,
    (child, relationship: SchemaNodeChild) =>
      transformSchemaNode(child, transformer, {
        path: [...context.path, relationship.pathSegment],
        definitionLookup: context.definitionLookup,
        parent: node,
        ...(context.containingDefinition
          ? { containingDefinition: context.containingDefinition }
          : {}),
        via: relationship.via,
      }),
  );

  return (
    transformer.transformNode?.(transformedChildren, context) ??
    transformedChildren
  );
}

function createDefinitionLookup(
  definitions: readonly SchemaDefinition[],
): ReadonlyMap<string, SchemaDefinition> {
  return new Map(
    definitions.map((definition) => [definition.name.source, definition]),
  );
}

function collectReachableDefinitionNames(
  document: SchemaDocument,
): ReadonlySet<string> {
  const reachable = new Set<string>();

  walkSchemaDocumentFromRoot(
    document,
    {
      enter(context) {
        if (
          context.node.kind === "reference" &&
          context.referenceResolution?.status === "resolved"
        ) {
          reachable.add(context.referenceResolution.definition.name.source);
        }
      },
    },
    { references: "follow" },
  );

  return reachable;
}
