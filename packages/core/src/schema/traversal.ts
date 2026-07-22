import type { SchemaDefinition, SchemaDocument, SchemaNode } from "./types.js";

export type SchemaWalkReferenceMode = "preserve" | "follow";

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
}

export interface SchemaWalkNodeContext {
  document: SchemaDocument;
  path: string[];
  definitionLookup: ReadonlyMap<string, SchemaDefinition>;
  parent?: SchemaNode;
  containingDefinition?: SchemaDefinition;
  via?: SchemaWalkVia;
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
}

export function walkSchemaDocument(
  document: SchemaDocument,
  visitor: SchemaWalkVisitor,
  options?: SchemaWalkOptions,
): void {
  const definitionLookup = new Map(
    document.definitions.map((definition) => [
      definition.name.source,
      definition,
    ]),
  );
  const state: SchemaWalkState = {
    referenceMode: options?.references ?? "preserve",
    seenReferences: new Set(),
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

export function walkSchemaNode(
  node: SchemaNode,
  context: SchemaWalkNodeContext,
  visitor: SchemaWalkVisitor,
  options?: SchemaWalkOptions,
): void {
  const state: SchemaWalkState = {
    referenceMode: options?.references ?? "preserve",
    seenReferences: new Set(),
  };

  walkNode(node, context, visitor, state);
}

function walkNode(
  node: SchemaNode,
  context: SchemaWalkNodeContext,
  visitor: SchemaWalkVisitor,
  state: SchemaWalkState,
): void {
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
  });

  switch (node.kind) {
    case "scalar":
    case "literal":
    case "null":
    case "unknown":
      return;
    case "reference":
      followReferenceIfConfigured(node, context, visitor, state);
      return;
    case "array":
      walkNode(
        node.elementType,
        {
          ...inheritChildContext(context, node),
          path: [...context.path, "elementType"],
          via: { kind: "elementType" },
        },
        visitor,
        state,
      );
      return;
    case "tuple":
      for (const [index, element] of node.elements.entries()) {
        walkNode(
          element.type,
          {
            ...inheritChildContext(context, node),
            path: [...context.path, String(index)],
            via: { kind: "tupleElement", index },
          },
          visitor,
          state,
        );
      }
      return;
    case "record":
      walkNode(
        node.key,
        {
          ...inheritChildContext(context, node),
          path: [...context.path, "key"],
          via: { kind: "recordKey" },
        },
        visitor,
        state,
      );
      walkNode(
        node.value,
        {
          ...inheritChildContext(context, node),
          path: [...context.path, "value"],
          via: { kind: "recordValue" },
        },
        visitor,
        state,
      );
      return;
    case "union":
      for (const [index, member] of node.members.entries()) {
        walkNode(
          member,
          {
            ...inheritChildContext(context, node),
            path: [...context.path, String(index)],
            via: { kind: "unionMember", index },
          },
          visitor,
          state,
        );
      }
      return;
    case "object":
      for (const field of node.fields) {
        walkNode(
          field.type,
          {
            ...inheritChildContext(context, node),
            path: [...context.path, field.name.source],
            via: { kind: "field", fieldName: field.name.source },
          },
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
): void {
  if (state.referenceMode !== "follow") {
    return;
  }

  if (state.seenReferences.has(node.name)) {
    return;
  }

  const definition = context.definitionLookup.get(node.name);

  if (definition === undefined) {
    return;
  }

  const nextSeenReferences = new Set(state.seenReferences);
  nextSeenReferences.add(node.name);

  walkNode(
    definition.type,
    {
      document: context.document,
      path: context.path,
      definitionLookup: context.definitionLookup,
      parent: node,
      containingDefinition: definition,
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

function inheritChildContext(
  context: SchemaWalkNodeContext,
  parent: SchemaNode,
): Pick<
  SchemaWalkNodeContext,
  "document" | "definitionLookup" | "parent" | "containingDefinition"
> {
  return {
    document: context.document,
    definitionLookup: context.definitionLookup,
    parent,
    ...(context.containingDefinition
      ? { containingDefinition: context.containingDefinition }
      : {}),
  };
}
