import type { SchemaNode } from "./types.js";
import type { SchemaFieldNode } from "./types.js";
import {
  appendSchemaPath,
  schemaPathToDiagnosticPath,
  type SchemaPathSegment,
} from "./path.js";
import type { SchemaWalkNodeContext, SchemaWalkVia } from "./traversal.js";

export interface SchemaNodeChild {
  node: SchemaNode;
  pathSegment: SchemaPathSegment;
  via: SchemaWalkVia;
}

export function getSchemaNodeChildren(
  node: SchemaNode,
): readonly SchemaNodeChild[] {
  switch (node.kind) {
    case "scalar":
    case "literal":
    case "null":
    case "unknown":
    case "reference":
      return [];
    case "array":
      return [
        {
          node: node.elementType,
          pathSegment: { kind: "elementType" },
          via: { kind: "elementType" },
        },
      ];
    case "tuple":
      return node.elements.map((element, index) => ({
        node: element.type,
        pathSegment: { kind: "tupleElement", index },
        via: { kind: "tupleElement", index },
      }));
    case "record":
      return [
        {
          node: node.key,
          pathSegment: { kind: "recordKey" },
          via: { kind: "recordKey" },
        },
        {
          node: node.value,
          pathSegment: { kind: "recordValue" },
          via: { kind: "recordValue" },
        },
      ];
    case "union":
      return node.members.map((member, index) => ({
        node: member,
        pathSegment: { kind: "unionMember", index },
        via: { kind: "unionMember", index },
      }));
    case "object":
      return node.fields.map((field) => ({
        node: field.type,
        pathSegment: { kind: "field", name: field.name.source },
        via: { kind: "field", fieldName: field.name.source },
      }));
  }
}

export function createSchemaChildContext(
  context: SchemaWalkNodeContext,
  parent: SchemaNode,
  child: SchemaNodeChild,
): SchemaWalkNodeContext {
  return {
    document: context.document,
    typedPath: appendSchemaPath(context.typedPath, child.pathSegment),
    path: schemaPathToDiagnosticPath(
      appendSchemaPath(context.typedPath, child.pathSegment),
    ),
    definitionLookup: context.definitionLookup,
    ...(context.lexicalDefinition
      ? { lexicalDefinition: context.lexicalDefinition }
      : {}),
    referenceStack: context.referenceStack,
    parent,
    ...(context.containingDefinition
      ? { containingDefinition: context.containingDefinition }
      : {}),
    via: child.via,
  };
}

export function mapSchemaNodeChildren(
  node: SchemaNode,
  mapper: (child: SchemaNode, relationship: SchemaNodeChild) => SchemaNode,
): SchemaNode {
  switch (node.kind) {
    case "scalar":
    case "literal":
    case "null":
    case "unknown":
    case "reference":
      return node;
    case "array": {
      const [child] = getSchemaNodeChildren(node);
      const nextElementType =
        child === undefined ? node.elementType : mapper(child.node, child);

      return nextElementType === node.elementType
        ? node
        : {
            kind: "array",
            elementType: nextElementType,
          };
    }
    case "tuple": {
      let changed = false;
      const nextElements = node.elements.map((element, index) => {
        const relationship: SchemaNodeChild = {
          node: element.type,
          pathSegment: { kind: "tupleElement", index },
          via: { kind: "tupleElement", index },
        };
        const nextType = mapper(element.type, relationship);

        if (nextType === element.type) {
          return element;
        }

        changed = true;
        return {
          required: element.required,
          type: nextType,
        };
      });

      return changed
        ? {
            kind: "tuple",
            elements: nextElements,
          }
        : node;
    }
    case "record": {
      const [keyChild, valueChild] = getSchemaNodeChildren(node);
      const nextKey =
        keyChild === undefined ? node.key : mapper(keyChild.node, keyChild);
      const nextValue =
        valueChild === undefined
          ? node.value
          : mapper(valueChild.node, valueChild);

      return nextKey === node.key && nextValue === node.value
        ? node
        : {
            kind: "record",
            key: nextKey,
            value: nextValue,
          };
    }
    case "union": {
      let changed = false;
      const nextMembers = node.members.map((member, index) => {
        const relationship: SchemaNodeChild = {
          node: member,
          pathSegment: { kind: "unionMember", index },
          via: { kind: "unionMember", index },
        };
        const nextMember = mapper(member, relationship);

        if (nextMember !== member) {
          changed = true;
        }

        return nextMember;
      });

      return changed
        ? {
            kind: "union",
            members: nextMembers,
          }
        : node;
    }
    case "object": {
      let changed = false;
      const nextFields = node.fields.map((field): SchemaFieldNode => {
        const relationship: SchemaNodeChild = {
          node: field.type,
          pathSegment: { kind: "field", name: field.name.source },
          via: { kind: "field", fieldName: field.name.source },
        };
        const nextType = mapper(field.type, relationship);

        if (nextType === field.type) {
          return field;
        }

        changed = true;
        return {
          kind: "field",
          name: field.name,
          required: field.required,
          nullable: field.nullable,
          type: nextType,
        };
      });

      return changed
        ? {
            kind: "object",
            fields: nextFields,
          }
        : node;
    }
  }
}
