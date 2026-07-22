import { mapSchemaNodeChildren, type SchemaNodeChild } from "./children.js";
import { createSchemaDefinitionIndex } from "./definitions.js";
import {
  appendSchemaPath,
  createDefinitionSchemaPath,
  createRootSchemaPath,
  schemaPathToDiagnosticPath,
  type SchemaPath,
} from "./path.js";
import type { SchemaDefinition, SchemaDocument, SchemaNode } from "./types.js";
import { walkSchemaDocumentFromRoot } from "./traversal.js";
import type { SchemaWalkVia } from "./traversal.js";

export type SchemaTransformReferenceMode = "preserve" | "follow";
export type SchemaTransformReachabilityMode =
  | "selected-only"
  | "selected-and-root-reachable-definitions";

export interface SchemaTransformContext {
  typedPath: SchemaPath;
  path: string[];
  definitionLookup: ReadonlyMap<string, SchemaDefinition>;
  parent?: SchemaNode;
  containingDefinition?: SchemaDefinition;
  via?: SchemaWalkVia;
}

export interface SchemaTransformOptions {
  reachability?: SchemaTransformReachabilityMode;
  /**
   * @deprecated Prefer `reachability`. `"preserve"` maps to
   * `"selected-only"` and `"follow"` maps to
   * `"selected-and-root-reachable-definitions"`.
   */
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
  options?: SchemaTransformOptions,
): SchemaDocument {
  void options;
  const definitionLookup = createSchemaDefinitionIndex(document).unique;

  let definitionsChanged = false;
  const nextDefinitions = document.definitions.map((definition) => {
    const nextType = transformSchemaNode(definition.type, transformer, {
      path: ["definitions", definition.name.source],
      typedPath: createDefinitionSchemaPath(definition.name.source),
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
    typedPath: createRootSchemaPath(),
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
  const definitionLookup = createSchemaDefinitionIndex(document).unique;
  const reachableDefinitions =
    resolveSchemaTransformReachability(options) ===
    "selected-and-root-reachable-definitions"
      ? collectReachableDefinitionNames(document)
      : undefined;
  const nextRoot = transformSchemaNode(document.root, transformer, {
    path: ["root"],
    typedPath: createRootSchemaPath(),
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
            typedPath: createDefinitionSchemaPath(definition.name.source),
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
  options?: SchemaTransformOptions,
): SchemaDocument {
  void options;
  const definitionLookup = createSchemaDefinitionIndex(document).unique;

  let definitionsChanged = false;
  const nextDefinitions = document.definitions.map((definition) => {
    const nextType = transformSchemaNode(definition.type, transformer, {
      path: ["definitions", definition.name.source],
      typedPath: createDefinitionSchemaPath(definition.name.source),
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
        typedPath: appendSchemaPath(context.typedPath, relationship.pathSegment),
        path: schemaPathToDiagnosticPath(
          appendSchemaPath(context.typedPath, relationship.pathSegment),
        ),
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

function resolveSchemaTransformReachability(
  options?: SchemaTransformOptions,
): SchemaTransformReachabilityMode {
  if (options?.reachability) {
    return options.reachability;
  }

  return options?.references === "follow"
    ? "selected-and-root-reachable-definitions"
    : "selected-only";
}
