import type {
  ScalarKind,
  SchemaLiteralValue,
  SchemaArrayNode,
  SchemaDocument,
  SchemaDefinition,
  SchemaFieldNode,
  SchemaLiteralNode,
  SchemaNullNode,
  SchemaNode,
  SchemaObjectNode,
  SchemaReferenceNode,
  SchemaRecordNode,
  SchemaScalarNode,
  SchemaTupleElement,
  SchemaTupleNode,
  SchemaUnionNode,
  SchemaUnknownEvidence,
  SchemaUnknownNode,
  UnknownReason,
} from "./types.js";
import { identifierName, type IdentifierInput } from "./identifiers.js";
import {
  normalizeTupleElement,
  normalizeUnionMembers,
  normalizeUnknownEvidence,
} from "./normalization.js";
import {
  validateSchemaDocument,
  validateSchemaFieldNullability,
} from "./validation.js";

export function schemaScalarNode(scalar: ScalarKind): SchemaScalarNode {
  return {
    kind: "scalar",
    scalar,
  };
}

export function schemaLiteralNode(
  value: SchemaLiteralValue,
): SchemaLiteralNode {
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

export function schemaReferenceNode(name: string): SchemaReferenceNode {
  if (name.trim().length === 0) {
    throw new Error(
      "Invalid schema reference: references must use a non-empty definition name.",
    );
  }

  return {
    kind: "reference",
    name,
  };
}

export function schemaUnionNode(members: SchemaNode[]): SchemaUnionNode {
  const normalizedMembers = normalizeUnionMembers(members);

  return {
    kind: "union",
    members: normalizedMembers,
  };
}

export function schemaDefinition(
  name: IdentifierInput,
  type: SchemaNode,
): SchemaDefinition {
  const normalizedName = identifierName(name);

  if (normalizedName.source.trim().length === 0) {
    throw new Error(
      "Invalid schema definition: definitions must use a non-empty name.",
    );
  }

  return {
    name: normalizedName,
    type,
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
  evidence?: SchemaUnknownEvidence;
}): SchemaUnknownNode {
  const evidence = normalizeUnknownEvidence(options?.evidence);

  return {
    kind: "unknown",
    reason: options?.reason ?? "no-evidence",
    nullable: options?.nullable ?? false,
    ...(evidence ? { evidence } : {}),
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
  if (options?.nullable) {
    validateSchemaFieldNullability(type);
  }

  return {
    kind: "field",
    name: identifierName(name),
    required: options?.required ?? true,
    nullable: options?.nullable ?? false,
    type,
  };
}

function isSupportedRecordKeyNode(node: SchemaNode): boolean {
  return node.kind === "scalar" && node.scalar === "string";
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
  options?: {
    definitions?: SchemaDefinition[];
  },
): SchemaDocument {
  const definitions = options?.definitions ?? [];
  const document: SchemaDocument = {
    version: "0.1",
    kind: "document",
    name: identifierName(name),
    definitions,
    root,
  };

  validateSchemaDocument(document);

  return document;
}
