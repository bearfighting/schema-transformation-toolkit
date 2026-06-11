import type {
  ArrayTypeNode,
  FieldNode,
  IdentifierName,
  ObjectTypeNode,
  ScalarKind,
  ScalarTypeNode,
  SchemaDocument,
  UnknownReason,
  UnknownTypeNode,
  TypeNode,
} from "./types.js";

type IdentifierInput = string | IdentifierName;

export function scalarType(scalar: ScalarKind): ScalarTypeNode {
  return {
    kind: "scalar",
    scalar,
  };
}

export function unknownType(options?: {
  reason?: UnknownReason;
  nullable?: boolean;
}): UnknownTypeNode {
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

export function fieldNode(
  name: IdentifierInput,
  type: TypeNode,
  options?: {
    required?: boolean;
    nullable?: boolean;
  },
): FieldNode {
  return {
    kind: "field",
    name: identifierName(name),
    required: options?.required ?? true,
    nullable: options?.nullable ?? false,
    type,
  };
}

export function objectType(fields: FieldNode[]): ObjectTypeNode {
  return {
    kind: "object",
    fields,
  };
}

export function arrayType(elementType: TypeNode): ArrayTypeNode {
  return {
    kind: "array",
    elementType,
  };
}

export function schemaDocument(
  name: IdentifierInput,
  root: TypeNode,
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
