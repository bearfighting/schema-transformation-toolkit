import type { SchemaDefinition, SchemaDocument, SchemaNode } from "./types.js";

export function validateSchemaDocument(document: SchemaDocument): void {
  const definitionMap = new Map<string, SchemaDefinition>();

  for (const definition of document.definitions) {
    if (definition.name.source.trim().length === 0) {
      throw new Error(
        "Invalid schema document: definitions must use a non-empty name.",
      );
    }

    if (definitionMap.has(definition.name.source)) {
      throw new Error(
        `Invalid schema document: duplicate definition name "${definition.name.source}".`,
      );
    }

    definitionMap.set(definition.name.source, definition);
  }

  for (const definition of document.definitions) {
    validateSchemaNodeReferences(definition.type, definitionMap);
  }

  validateSchemaNodeReferences(document.root, definitionMap);
}

export function validateSchemaFieldNullability(type: SchemaNode): void {
  if (schemaNodeIncludesNull(type)) {
    throw new Error(
      'Invalid schema field: a field whose type already includes "null" cannot also be marked nullable.',
    );
  }
}

function validateSchemaNodeReferences(
  node: SchemaNode,
  definitions: ReadonlyMap<string, SchemaDefinition>,
): void {
  switch (node.kind) {
    case "scalar":
    case "literal":
    case "null":
    case "unknown":
      return;
    case "reference":
      if (!definitions.has(node.name)) {
        throw new Error(
          `Invalid schema document: reference "${node.name}" does not match a known definition.`,
        );
      }
      return;
    case "array":
      validateSchemaNodeReferences(node.elementType, definitions);
      return;
    case "tuple":
      for (const element of node.elements) {
        validateSchemaNodeReferences(element.type, definitions);
      }
      return;
    case "record":
      validateSchemaNodeReferences(node.key, definitions);
      validateSchemaNodeReferences(node.value, definitions);
      return;
    case "union":
      for (const member of node.members) {
        validateSchemaNodeReferences(member, definitions);
      }
      return;
    case "object":
      for (const field of node.fields) {
        validateSchemaNodeReferences(field.type, definitions);
      }
      return;
  }
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
