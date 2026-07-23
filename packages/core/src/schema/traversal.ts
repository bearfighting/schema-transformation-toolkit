import type {
  SchemaDefinition,
  SchemaDocument,
  SchemaFieldNode,
  SchemaNode,
  SchemaObjectNode,
  SchemaTupleElement,
  SchemaTupleNode,
} from "./types.js";
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
export type SchemaWalkControl = "continue" | "skip-children" | "stop";
export type SchemaReferenceVisitMode = "per-occurrence" | "once-per-definition";
export interface SchemaReferenceFrame {
  reference: Extract<SchemaNode, { kind: "reference" }>;
  sourcePath: SchemaPath;
  sourceDefinition?: SchemaDefinition;
  targetDefinition: SchemaDefinition;
}

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
  lexicalDefinition?: SchemaDefinition;
  referenceStack: readonly SchemaReferenceFrame[];
  parent?: SchemaNode;
  containingDefinition?: SchemaDefinition;
  via?: SchemaWalkVia;
  referenceResolution?: SchemaReferenceTraversalStatus;
}

export interface SchemaDefinitionWalkContext {
  document: SchemaDocument;
  definition: SchemaDefinition;
  typedPath: SchemaPath;
  path: string[];
  definitionLookup: ReadonlyMap<string, SchemaDefinition>;
  lexicalDefinition: SchemaDefinition;
  referenceStack: readonly SchemaReferenceFrame[];
}

export interface SchemaFieldWalkContext {
  document: SchemaDocument;
  field: SchemaFieldNode;
  parent: SchemaObjectNode;
  typedPath: SchemaPath;
  path: string[];
  definitionLookup: ReadonlyMap<string, SchemaDefinition>;
  lexicalDefinition?: SchemaDefinition;
  referenceStack: readonly SchemaReferenceFrame[];
  containingDefinition?: SchemaDefinition;
}

export interface SchemaTupleElementWalkContext {
  document: SchemaDocument;
  element: SchemaTupleElement;
  index: number;
  parent: SchemaTupleNode;
  typedPath: SchemaPath;
  path: string[];
  definitionLookup: ReadonlyMap<string, SchemaDefinition>;
  lexicalDefinition?: SchemaDefinition;
  referenceStack: readonly SchemaReferenceFrame[];
  containingDefinition?: SchemaDefinition;
}

export interface SchemaWalkNodeContext {
  document: SchemaDocument;
  typedPath: SchemaPath;
  path: string[];
  definitionLookup: ReadonlyMap<string, SchemaDefinition>;
  lexicalDefinition?: SchemaDefinition;
  referenceStack: readonly SchemaReferenceFrame[];
  parent?: SchemaNode;
  containingDefinition?: SchemaDefinition;
  via?: SchemaWalkVia;
  referenceResolution?: SchemaReferenceTraversalStatus;
}

export interface SchemaWalkVisitor {
  enterDefinition?(
    context: SchemaDefinitionWalkContext,
  ): SchemaWalkControl | void;
  leaveDefinition?(context: SchemaDefinitionWalkContext): void;
  enterField?(context: SchemaFieldWalkContext): SchemaWalkControl | void;
  leaveField?(context: SchemaFieldWalkContext): void;
  enterTupleElement?(
    context: SchemaTupleElementWalkContext,
  ): SchemaWalkControl | void;
  leaveTupleElement?(context: SchemaTupleElementWalkContext): void;
  enter?(context: SchemaWalkContext): SchemaWalkControl | void;
  leave?(context: SchemaWalkContext): void;
}

export interface SchemaWalkOptions {
  references?: SchemaWalkReferenceMode;
  referenceVisits?: SchemaReferenceVisitMode;
}

interface SchemaWalkState {
  referenceMode: SchemaWalkReferenceMode;
  referenceVisitMode: SchemaReferenceVisitMode;
  seenReferences: ReadonlySet<string>;
  followedDefinitions: Set<string>;
  definitionIndex: SchemaDefinitionIndex;
  stopped: boolean;
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
    referenceVisitMode: options?.referenceVisits ?? "per-occurrence",
    seenReferences: new Set(),
    followedDefinitions: new Set(),
    definitionIndex,
    stopped: false,
  };

  for (const definition of document.definitions) {
    if (state.stopped) {
      return;
    }

    walkDefinition(document, definition, definitionLookup, visitor, state);
  }

  if (state.stopped) {
    return;
  }

  walkNode(
    document.root,
    {
      document,
      typedPath: createRootSchemaPath(),
      path: schemaPathToDiagnosticPath(createRootSchemaPath()),
      definitionLookup,
      referenceStack: [],
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
    referenceVisitMode: options?.referenceVisits ?? "per-occurrence",
    seenReferences: new Set(),
    followedDefinitions: new Set(),
    definitionIndex,
    stopped: false,
  };

  walkNode(
    document.root,
    {
      document,
      typedPath: createRootSchemaPath(),
      path: schemaPathToDiagnosticPath(createRootSchemaPath()),
      definitionLookup,
      referenceStack: [],
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
    referenceVisitMode: options?.referenceVisits ?? "per-occurrence",
    seenReferences: new Set(),
    followedDefinitions: new Set(),
    definitionIndex,
    stopped: false,
  };

  for (const definition of document.definitions) {
    if (state.stopped) {
      return;
    }

    walkDefinition(document, definition, definitionLookup, visitor, state);
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
    referenceVisitMode: options?.referenceVisits ?? "per-occurrence",
    seenReferences: new Set(),
    followedDefinitions: new Set(),
    definitionIndex: createSchemaDefinitionIndexFromLookup(
      context.definitionLookup,
    ),
    stopped: false,
  };

  walkNode(node, context, visitor, state);
}

function walkNode(
  node: SchemaNode,
  context: SchemaWalkNodeContext,
  visitor: SchemaWalkVisitor,
  state: SchemaWalkState,
): void {
  if (state.stopped) {
    return;
  }

  const referenceResolution =
    node.kind === "reference"
      ? (context.referenceResolution ??
        resolveReferenceTraversalStatus(node, context, state))
      : undefined;
  const walkContext = createWalkContext(node, context, referenceResolution);

  const control = visitor.enter?.(walkContext) ?? "continue";

  if (control === "stop") {
    state.stopped = true;
    return;
  }

  if (control === "skip-children") {
    visitor.leave?.(walkContext);
    return;
  }

  switch (node.kind) {
    case "scalar":
    case "literal":
    case "null":
    case "unknown":
      visitor.leave?.(walkContext);
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
      if (!state.stopped) {
        visitor.leave?.(walkContext);
      }
      return;
    case "array":
    case "record":
    case "union":
      for (const child of getSchemaNodeChildren(node)) {
        if (state.stopped) {
          return;
        }

        walkNode(
          child.node,
          createSchemaChildContext(context, node, child),
          visitor,
          state,
        );
      }
      if (!state.stopped) {
        visitor.leave?.(walkContext);
      }
      return;
    case "tuple":
      for (const [index, element] of node.elements.entries()) {
        if (state.stopped) {
          return;
        }

        walkTupleElement(node, element, index, context, visitor, state);
      }
      if (!state.stopped) {
        visitor.leave?.(walkContext);
      }
      return;
    case "object":
      for (const field of node.fields) {
        if (state.stopped) {
          return;
        }

        walkField(node, field, context, visitor, state);
      }
      if (!state.stopped) {
        visitor.leave?.(walkContext);
      }
      return;
  }
}

function walkDefinition(
  document: SchemaDocument,
  definition: SchemaDefinition,
  definitionLookup: ReadonlyMap<string, SchemaDefinition>,
  visitor: SchemaWalkVisitor,
  state: SchemaWalkState,
): void {
  const typedPath = createDefinitionSchemaPath(definition.name.source);
  const context: SchemaDefinitionWalkContext = {
    document,
    definition,
    typedPath,
    path: schemaPathToDiagnosticPath(typedPath),
    definitionLookup,
    lexicalDefinition: definition,
    referenceStack: [],
  };

  const control = visitor.enterDefinition?.(context) ?? "continue";

  if (control === "stop") {
    state.stopped = true;
    return;
  }

  if (control === "skip-children") {
    visitor.leaveDefinition?.(context);
    return;
  }

  walkNode(
    definition.type,
    {
      document,
      typedPath,
      path: context.path,
      definitionLookup,
      lexicalDefinition: definition,
      referenceStack: context.referenceStack,
      containingDefinition: definition,
      via: {
        kind: "definition",
        definitionName: definition.name.source,
      },
    },
    visitor,
    state,
  );

  if (!state.stopped) {
    visitor.leaveDefinition?.(context);
  }
}

function walkField(
  parent: SchemaObjectNode,
  field: SchemaFieldNode,
  context: SchemaWalkNodeContext,
  visitor: SchemaWalkVisitor,
  state: SchemaWalkState,
): void {
  const childContext = createSchemaChildContext(context, parent, {
    node: field.type,
    pathSegment: { kind: "field", name: field.name.source },
    via: { kind: "field", fieldName: field.name.source },
  });
  const fieldContext: SchemaFieldWalkContext = {
    document: context.document,
    field,
    parent,
    typedPath: childContext.typedPath,
    path: childContext.path,
    definitionLookup: context.definitionLookup,
    ...(context.lexicalDefinition
      ? { lexicalDefinition: context.lexicalDefinition }
      : {}),
    referenceStack: context.referenceStack,
    ...(context.containingDefinition
      ? { containingDefinition: context.containingDefinition }
      : {}),
  };

  const control = visitor.enterField?.(fieldContext) ?? "continue";

  if (control === "stop") {
    state.stopped = true;
    return;
  }

  if (control === "skip-children") {
    visitor.leaveField?.(fieldContext);
    return;
  }

  walkNode(field.type, childContext, visitor, state);

  if (!state.stopped) {
    visitor.leaveField?.(fieldContext);
  }
}

function walkTupleElement(
  parent: SchemaTupleNode,
  element: SchemaTupleElement,
  index: number,
  context: SchemaWalkNodeContext,
  visitor: SchemaWalkVisitor,
  state: SchemaWalkState,
): void {
  const childContext = createSchemaChildContext(context, parent, {
    node: element.type,
    pathSegment: { kind: "tupleElement", index },
    via: { kind: "tupleElement", index },
  });
  const elementContext: SchemaTupleElementWalkContext = {
    document: context.document,
    element,
    index,
    parent,
    typedPath: childContext.typedPath,
    path: childContext.path,
    definitionLookup: context.definitionLookup,
    ...(context.lexicalDefinition
      ? { lexicalDefinition: context.lexicalDefinition }
      : {}),
    referenceStack: context.referenceStack,
    ...(context.containingDefinition
      ? { containingDefinition: context.containingDefinition }
      : {}),
  };

  const control = visitor.enterTupleElement?.(elementContext) ?? "continue";

  if (control === "stop") {
    state.stopped = true;
    return;
  }

  if (control === "skip-children") {
    visitor.leaveTupleElement?.(elementContext);
    return;
  }

  walkNode(element.type, childContext, visitor, state);

  if (!state.stopped) {
    visitor.leaveTupleElement?.(elementContext);
  }
}

function createWalkContext(
  node: SchemaNode,
  context: SchemaWalkNodeContext,
  referenceResolution?: SchemaReferenceTraversalStatus,
): SchemaWalkContext {
  return {
    document: context.document,
    node,
    typedPath: context.typedPath,
    path: context.path,
    definitionLookup: context.definitionLookup,
    ...(context.lexicalDefinition
      ? { lexicalDefinition: context.lexicalDefinition }
      : {}),
    referenceStack: context.referenceStack,
    ...(context.parent ? { parent: context.parent } : {}),
    ...(context.containingDefinition
      ? { containingDefinition: context.containingDefinition }
      : {}),
    ...(context.via ? { via: context.via } : {}),
    ...(referenceResolution ? { referenceResolution } : {}),
  };
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

  if (
    state.referenceVisitMode === "once-per-definition" &&
    state.followedDefinitions.has(resolution.definition.name.source)
  ) {
    return;
  }

  const nextSeenReferences = new Set(state.seenReferences);
  nextSeenReferences.add(node.name);
  state.followedDefinitions.add(resolution.definition.name.source);

  walkNode(
    resolution.definition.type,
    {
      document: context.document,
      typedPath: context.typedPath,
      path: context.path,
      definitionLookup: context.definitionLookup,
      ...(context.lexicalDefinition
        ? { lexicalDefinition: context.lexicalDefinition }
        : {}),
      referenceStack: [
        ...context.referenceStack,
        {
          reference: node,
          sourcePath: context.typedPath,
          ...(context.lexicalDefinition
            ? { sourceDefinition: context.lexicalDefinition }
            : {}),
          targetDefinition: resolution.definition,
        },
      ],
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
