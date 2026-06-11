import type {
  IdentifierName,
  ScalarKind,
  SchemaLiteralValue,
  SchemaArrayNode,
  SchemaDocument,
  SchemaFieldNode,
  SchemaLiteralNode,
  SchemaNullNode,
  SchemaNode,
  SchemaObjectNode,
  SchemaRecordNode,
  SchemaScalarNode,
  SchemaTupleElement,
  SchemaTupleNode,
  SchemaUnionNode,
  SchemaUnknownNode,
  UnknownReason,
} from "./types.js";

type IdentifierInput = string | IdentifierName;

export function schemaScalarNode(scalar: ScalarKind): SchemaScalarNode {
  return {
    kind: "scalar",
    scalar,
  };
}

export function schemaLiteralNode(value: SchemaLiteralValue): SchemaLiteralNode {
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new Error(
      "Invalid schema literal: numeric literal values must be finite.",
    );
  }

  return {
    kind: "literal",
    value,
  };
}

export function schemaUnionNode(members: SchemaNode[]): SchemaUnionNode {
  const normalizedMembers = normalizeUnionMembers(members);

  return {
    kind: "union",
    members: normalizedMembers,
  };
}

export function schemaTupleElement(
  type: SchemaNode,
  options?: {
    required?: boolean;
  },
): SchemaTupleElement {
  return {
    required: options?.required ?? true,
    type,
  };
}

export function schemaTupleNode(
  elements: Array<SchemaNode | SchemaTupleElement>,
): SchemaTupleNode {
  return {
    kind: "tuple",
    elements: elements.map(normalizeTupleElement),
  };
}

export function schemaRecordNode(
  key: SchemaNode,
  value: SchemaNode,
): SchemaRecordNode {
  if (!isSupportedRecordKeyNode(key)) {
    throw new Error(
      'Invalid schema record: record keys must currently be represented as the scalar type "string".',
    );
  }

  return {
    kind: "record",
    key,
    value,
  };
}

export function schemaNullNode(): SchemaNullNode {
  return {
    kind: "null",
  };
}

export function schemaUnknownNode(options?: {
  reason?: UnknownReason;
  nullable?: boolean;
}): SchemaUnknownNode {
  return {
    kind: "unknown",
    ...(options?.reason ? { reason: options.reason } : {}),
    nullable: options?.nullable ?? false,
  };
}

export function identifierName(name: IdentifierInput): IdentifierName {
  if (typeof name !== "string") {
    return {
      source: name.source,
      words: normalizeWords(name.words, name.source),
    };
  }

  return {
    source: name,
    words: splitIdentifierWords(name),
  };
}

export function schemaFieldNode(
  name: IdentifierInput,
  type: SchemaNode,
  options?: {
    required?: boolean;
    nullable?: boolean;
  },
): SchemaFieldNode {
  if (schemaNodeIncludesNull(type) && options?.nullable) {
    throw new Error(
      'Invalid schema field: a field whose type already includes "null" cannot also be marked nullable.',
    );
  }

  return {
    kind: "field",
    name: identifierName(name),
    required: options?.required ?? true,
    nullable: options?.nullable ?? false,
    type,
  };
}

function schemaNodeIncludesNull(type: SchemaNode): boolean {
  if (type.kind === "null") {
    return true;
  }

  if (type.kind === "union") {
    return type.members.some(schemaNodeIncludesNull);
  }

  return false;
}

function normalizeUnionMembers(members: SchemaNode[]): SchemaNode[] {
  const flattenedMembers = members.flatMap((member) =>
    member.kind === "union" ? normalizeUnionMembers(member.members) : [member],
  );
  const dedupedMembers: SchemaNode[] = [];

  for (const member of flattenedMembers) {
    const existingMember = dedupedMembers.find((candidate) =>
      areEquivalentSchemaNodes(candidate, member),
    );

    if (existingMember !== undefined) {
      continue;
    }

    dedupedMembers.push(member);
  }

  return dedupedMembers;
}

function normalizeTupleElement(
  element: SchemaNode | SchemaTupleElement,
): SchemaTupleElement {
  if ("type" in element && "required" in element) {
    return {
      required: element.required,
      type: element.type,
    };
  }

  return schemaTupleElement(element);
}

function isSupportedRecordKeyNode(node: SchemaNode): boolean {
  return node.kind === "scalar" && node.scalar === "string";
}

function areEquivalentSchemaNodes(left: SchemaNode, right: SchemaNode): boolean {
  if (left.kind !== right.kind) {
    return false;
  }

  switch (left.kind) {
    case "scalar":
      return right.kind === "scalar" && left.scalar === right.scalar;
    case "literal":
      return right.kind === "literal" && Object.is(left.value, right.value);
    case "null":
      return right.kind === "null";
    case "tuple":
      return (
        right.kind === "tuple" &&
        left.elements.length === right.elements.length &&
        left.elements.every((element, index) => {
          const rightElement = right.elements[index];

          return (
            rightElement !== undefined &&
            element.required === rightElement.required &&
            areEquivalentSchemaNodes(element.type, rightElement.type)
          );
        })
      );
    case "record":
      return (
        right.kind === "record" &&
        areEquivalentSchemaNodes(left.key, right.key) &&
        areEquivalentSchemaNodes(left.value, right.value)
      );
    case "unknown":
      return (
        right.kind === "unknown" &&
        left.reason === right.reason &&
        left.nullable === right.nullable
      );
    case "array":
      return (
        right.kind === "array" &&
        areEquivalentSchemaNodes(left.elementType, right.elementType)
      );
    case "object":
      return (
        right.kind === "object" &&
        left.fields.length === right.fields.length &&
        left.fields.every((field, index) => {
          const rightField = right.fields[index];

          return (
            rightField !== undefined &&
            field.name.source === rightField.name.source &&
            field.required === rightField.required &&
            field.nullable === rightField.nullable &&
            areEquivalentSchemaNodes(field.type, rightField.type)
          );
        })
      );
    case "union":
      return (
        right.kind === "union" &&
        left.members.length === right.members.length &&
        left.members.every((member) =>
          right.members.some((candidate) =>
            areEquivalentSchemaNodes(member, candidate),
          ),
        )
      );
  }
}

export function schemaObjectNode(fields: SchemaFieldNode[]): SchemaObjectNode {
  return {
    kind: "object",
    fields,
  };
}

export function schemaArrayNode(elementType: SchemaNode): SchemaArrayNode {
  return {
    kind: "array",
    elementType,
  };
}

export function schemaDocument(
  name: IdentifierInput,
  root: SchemaNode,
): SchemaDocument {
  return {
    version: "0.1",
    kind: "document",
    name: identifierName(name),
    root,
  };
}

function splitIdentifierWords(value: string): string[] {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.toLowerCase());
}

function normalizeWords(words: string[], fallbackSource: string): string[] {
  const normalizedWords = words
    .map((word) => word.trim().toLowerCase())
    .filter(Boolean);

  if (normalizedWords.length > 0) {
    return normalizedWords;
  }

  return splitIdentifierWords(fallbackSource);
}
