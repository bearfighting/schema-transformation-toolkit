import type { SchemaDefinition, SchemaDocument, SchemaNode } from "./types.js";
import { createSchemaChildContext, getSchemaNodeChildren } from "./children.js";
import {
  createSchemaDefinitionIndex,
  createSchemaDefinitionIndexFromLookup,
  resolveSchemaReference,
  type SchemaDefinitionIndex,
} from "./definitions.js";
import {
  createDefinitionSchemaPath,
  createRootSchemaPath,
  schemaPathToDiagnosticPath,
  type SchemaPath,
} from "./path.js";

export type SchemaWalkReferenceMode = "preserve" | "follow";

export type SchemaReferenceTraversalStatus =
  | { status: "not-followed" }
  | { status: "resolved"; definition: SchemaDefinition }
  | { status: "missing"; name: string }
  | {
      status: "ambiguous";
      name: string;
      definitions: readonly SchemaDefinition[];
    }
  | { status: "cycle"; name: string };

export type SchemaWalkVia =
  | { kind: "root" }
  | { kind: "definition"; definitionName: string }
  | { kind: "elementType" }
  | { kind: "tupleElement"; index: number }
  | { kind: "recordKey" }
  | { kind: "recordValue" }
  | { kind: "field"; fieldName: string }
  | { kind: "unionMember"; index: number }
  | { kind: "referenceResolution"; referenceName: string };

export interface SchemaWalkContext {
  document: SchemaDocument;
  node: SchemaNode;
  typedPath: SchemaPath;
  path: string[];
  definitionLookup: ReadonlyMap<string, SchemaDefinition>;
  parent?: SchemaNode;
  containingDefinition?: SchemaDefinition;
  via?: SchemaWalkVia;
  referenceResolution?: SchemaReferenceTraversalStatus;
}

export interface SchemaWalkNodeContext {
  document: SchemaDocument;
  typedPath: SchemaPath;
  path: string[];
  definitionLookup: ReadonlyMap<string, SchemaDefinition>;
  parent?: SchemaNode;
  containingDefinition?: SchemaDefinition;
  via?: SchemaWalkVia;
  referenceResolution?: SchemaReferenceTraversalStatus;
}

export interface SchemaWalkVisitor {
  enter?(context: SchemaWalkContext): void;
}

export interface SchemaWalkOptions {
  references?: SchemaWalkReferenceMode;
}

interface SchemaWalkState {
  referenceMode: SchemaWalkReferenceMode;
  seenReferences: ReadonlySet<string>;
  definitionIndex: SchemaDefinitionIndex;
}

export function walkSchemaDocument(
  document: SchemaDocument,
  visitor: SchemaWalkVisitor,
  options?: SchemaWalkOptions,
): void {
  walkSchemaDocumentStructure(document, visitor, options);
}

export function walkSchemaDocumentStructure(
  document: SchemaDocument,
  visitor: SchemaWalkVisitor,
  options?: SchemaWalkOptions,
): void {
  const definitionIndex = createSchemaDefinitionIndex(document);
  const definitionLookup = definitionIndex.unique;
  const state: SchemaWalkState = {
    referenceMode: options?.references ?? "preserve",
    seenReferences: new Set(),
    definitionIndex,
  };

  for (const definition of document.definitions) {
    walkNode(
      definition.type,
      {
        document,
        typedPath: createDefinitionSchemaPath(definition.name.source),
        path: schemaPathToDiagnosticPath(
          createDefinitionSchemaPath(definition.name.source),
        ),
        definitionLookup,
        containingDefinition: definition,
        via: {
          kind: "definition",
          definitionName: definition.name.source,
        },
      },
      visitor,
      state,
    );
  }

  walkNode(
    document.root,
    {
      document,
      typedPath: createRootSchemaPath(),
      path: schemaPathToDiagnosticPath(createRootSchemaPath()),
      definitionLookup,
      via: { kind: "root" },
    },
    visitor,
    state,
  );
}

export function walkSchemaDocumentFromRoot(
  document: SchemaDocument,
  visitor: SchemaWalkVisitor,
  options?: SchemaWalkOptions,
): void {
  const definitionIndex = createSchemaDefinitionIndex(document);
  const definitionLookup = definitionIndex.unique;
  const state: SchemaWalkState = {
    referenceMode: options?.references ?? "preserve",
    seenReferences: new Set(),
    definitionIndex,
  };

  walkNode(
    document.root,
    {
      document,
      typedPath: createRootSchemaPath(),
      path: schemaPathToDiagnosticPath(createRootSchemaPath()),
      definitionLookup,
      via: { kind: "root" },
    },
    visitor,
    state,
  );
}

export function walkSchemaDefinitions(
  document: SchemaDocument,
  visitor: SchemaWalkVisitor,
  options?: SchemaWalkOptions,
): void {
  const definitionIndex = createSchemaDefinitionIndex(document);
  const definitionLookup = definitionIndex.unique;
  const state: SchemaWalkState = {
    referenceMode: options?.references ?? "preserve",
    seenReferences: new Set(),
    definitionIndex,
  };

  for (const definition of document.definitions) {
    walkNode(
      definition.type,
      {
        document,
        typedPath: createDefinitionSchemaPath(definition.name.source),
        path: schemaPathToDiagnosticPath(
          createDefinitionSchemaPath(definition.name.source),
        ),
        definitionLookup,
        containingDefinition: definition,
        via: {
          kind: "definition",
          definitionName: definition.name.source,
        },
      },
      visitor,
      state,
    );
  }
}

export function walkSchemaNode(
  node: SchemaNode,
  context: SchemaWalkNodeContext,
  visitor: SchemaWalkVisitor,
  options?: SchemaWalkOptions,
): void {
  const state: SchemaWalkState = {
    referenceMode: options?.references ?? "preserve",
    seenReferences: new Set(),
    definitionIndex: createSchemaDefinitionIndexFromLookup(
      context.definitionLookup,
    ),
  };

  walkNode(node, context, visitor, state);
}

function walkNode(
  node: SchemaNode,
  context: SchemaWalkNodeContext,
  visitor: SchemaWalkVisitor,
  state: SchemaWalkState,
): void {
  const referenceResolution =
    node.kind === "reference"
      ? (context.referenceResolution ??
        resolveReferenceTraversalStatus(node, context, state))
      : undefined;

  visitor.enter?.({
    document: context.document,
    node,
    typedPath: context.typedPath,
    path: context.path,
    definitionLookup: context.definitionLookup,
    ...(context.parent ? { parent: context.parent } : {}),
    ...(context.containingDefinition
      ? { containingDefinition: context.containingDefinition }
      : {}),
    ...(context.via ? { via: context.via } : {}),
    ...(referenceResolution ? { referenceResolution } : {}),
  });

  switch (node.kind) {
    case "scalar":
    case "literal":
    case "null":
    case "unknown":
      return;
    case "reference":
      followReferenceIfConfigured(
        node,
        context,
        visitor,
        state,
        referenceResolution ??
          resolveReferenceTraversalStatus(node, context, state),
      );
      return;
    case "array":
    case "tuple":
    case "record":
    case "union":
    case "object":
      for (const child of getSchemaNodeChildren(node)) {
        walkNode(
          child.node,
          createSchemaChildContext(context, node, child),
          visitor,
          state,
        );
      }
      return;
  }
}

function followReferenceIfConfigured(
  node: Extract<SchemaNode, { kind: "reference" }>,
  context: SchemaWalkNodeContext,
  visitor: SchemaWalkVisitor,
  state: SchemaWalkState,
  resolution: SchemaReferenceTraversalStatus,
): void {
  if (resolution.status !== "resolved") {
    return;
  }

  const nextSeenReferences = new Set(state.seenReferences);
  nextSeenReferences.add(node.name);

  walkNode(
    resolution.definition.type,
    {
      document: context.document,
      typedPath: context.typedPath,
      path: context.path,
      definitionLookup: context.definitionLookup,
      parent: node,
      containingDefinition: resolution.definition,
      via: {
        kind: "referenceResolution",
        referenceName: node.name,
      },
    },
    visitor,
    {
      ...state,
      seenReferences: nextSeenReferences,
    },
  );
}

function resolveReferenceTraversalStatus(
  node: Extract<SchemaNode, { kind: "reference" }>,
  context: SchemaWalkNodeContext,
  state: SchemaWalkState,
): SchemaReferenceTraversalStatus {
  if (state.referenceMode !== "follow") {
    return { status: "not-followed" };
  }

  const resolution = resolveSchemaReference(state.definitionIndex, node.name);

  if (state.seenReferences.has(node.name)) {
    return { status: "cycle", name: node.name };
  }

  return resolution;
}
