import type { SchemaDefinition, SchemaDocument, SchemaNode } from "./types.js";
import {
  createSchemaChildContext,
  getSchemaNodeChildren,
} from "./children.js";

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
  path: string[];
  definitionLookup: ReadonlyMap<string, SchemaDefinition>;
  parent?: SchemaNode;
  containingDefinition?: SchemaDefinition;
  via?: SchemaWalkVia;
  referenceResolution?: SchemaReferenceTraversalStatus;
}

export interface SchemaWalkNodeContext {
  document: SchemaDocument;
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
  definitionIndex: ReadonlyMap<string, readonly SchemaDefinition[]>;
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
  const { definitionIndex, definitionLookup } =
    createDefinitionIndexes(document);
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
        path: ["definitions", definition.name.source],
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
      path: ["root"],
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
  const { definitionIndex, definitionLookup } =
    createDefinitionIndexes(document);
  const state: SchemaWalkState = {
    referenceMode: options?.references ?? "preserve",
    seenReferences: new Set(),
    definitionIndex,
  };

  walkNode(
    document.root,
    {
      document,
      path: ["root"],
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
  const { definitionIndex, definitionLookup } =
    createDefinitionIndexes(document);
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
        path: ["definitions", definition.name.source],
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
    definitionIndex: createDefinitionIndexFromLookup(context.definitionLookup),
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
        referenceResolution ?? resolveReferenceTraversalStatus(node, context, state),
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

function createDefinitionIndexes(document: SchemaDocument): {
  definitionIndex: ReadonlyMap<string, readonly SchemaDefinition[]>;
  definitionLookup: ReadonlyMap<string, SchemaDefinition>;
} {
  const definitionIndex = new Map<string, SchemaDefinition[]>();

  for (const definition of document.definitions) {
    const definitions = definitionIndex.get(definition.name.source);

    if (definitions === undefined) {
      definitionIndex.set(definition.name.source, [definition]);
      continue;
    }

    definitions.push(definition);
  }

  return {
    definitionIndex,
    definitionLookup: createUniqueDefinitionLookup(definitionIndex),
  };
}

function createDefinitionIndexFromLookup(
  definitionLookup: ReadonlyMap<string, SchemaDefinition>,
): ReadonlyMap<string, readonly SchemaDefinition[]> {
  return new Map(
    Array.from(definitionLookup.entries(), ([name, definition]) => [
      name,
      [definition],
    ]),
  );
}

function createUniqueDefinitionLookup(
  definitionIndex: ReadonlyMap<string, readonly SchemaDefinition[]>,
): ReadonlyMap<string, SchemaDefinition> {
  const definitionLookup = new Map<string, SchemaDefinition>();

  for (const [name, definitions] of definitionIndex.entries()) {
    if (definitions.length === 1) {
      const definition = definitions[0];

      if (definition !== undefined) {
        definitionLookup.set(name, definition);
      }
    }
  }

  return definitionLookup;
}

function resolveReferenceTraversalStatus(
  node: Extract<SchemaNode, { kind: "reference" }>,
  context: SchemaWalkNodeContext,
  state: SchemaWalkState,
): SchemaReferenceTraversalStatus {
  if (state.referenceMode !== "follow") {
    return { status: "not-followed" };
  }

  const definitions = state.definitionIndex.get(node.name);

  if (definitions === undefined || definitions.length === 0) {
    return { status: "missing", name: node.name };
  }

  if (definitions.length > 1) {
    return {
      status: "ambiguous",
      name: node.name,
      definitions,
    };
  }

  if (state.seenReferences.has(node.name)) {
    return { status: "cycle", name: node.name };
  }

  const definition = definitions[0];

  if (definition === undefined) {
    return { status: "missing", name: node.name };
  }

  return { status: "resolved", definition };
}
