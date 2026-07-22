import { identifierName } from "./identifiers.js";
import { schemaUnionNode } from "./factories.js";
import { normalizeUnionMembers, normalizeUnknownEvidence } from "./normalization.js";
import type {
  SchemaDefinition,
  SchemaDocument,
  SchemaFieldNode,
  SchemaNode,
  SchemaObjectNode,
} from "./types.js";
import {
  transformSchemaDocument,
  transformSchemaDocumentFromRoot,
  transformSchemaDocumentStructure,
  transformSchemaDefinitions,
  transformSchemaNode,
  type SchemaTransformContext,
  type SchemaTransformOptions,
} from "./transform.js";

export function normalizeSchemaDocument(
  document: SchemaDocument,
  options?: SchemaTransformOptions,
): SchemaDocument {
  return normalizeSchemaDocumentWrappers(
    transformSchemaDocument(document, NORMALIZE_SCHEMA_TRANSFORMER, options),
  );
}

export function normalizeSchemaDocumentStructure(
  document: SchemaDocument,
  options?: SchemaTransformOptions,
): SchemaDocument {
  return normalizeSchemaDocumentWrappers(
    transformSchemaDocumentStructure(
      document,
      NORMALIZE_SCHEMA_TRANSFORMER,
      options,
    ),
  );
}

export function normalizeSchemaDocumentFromRoot(
  document: SchemaDocument,
  options?: SchemaTransformOptions,
): SchemaDocument {
  return normalizeSchemaDocumentWrappers(
    transformSchemaDocumentFromRoot(
      document,
      NORMALIZE_SCHEMA_TRANSFORMER,
      options,
    ),
  );
}

export function normalizeSchemaDefinitions(
  document: SchemaDocument,
  options?: SchemaTransformOptions,
): SchemaDocument {
  return normalizeSchemaDocumentWrappers(
    transformSchemaDefinitions(
      document,
      NORMALIZE_SCHEMA_TRANSFORMER,
      options,
    ),
  );
}

export function normalizeSchemaNode(
  node: SchemaNode,
  context: SchemaTransformContext,
): SchemaNode {
  return transformSchemaNode(node, NORMALIZE_SCHEMA_TRANSFORMER, context);
}

const NORMALIZE_SCHEMA_TRANSFORMER = {
  transformNode(node: SchemaNode): SchemaNode {
    if (node.kind === "union") {
      const normalizedMembers = normalizeUnionMembers(node.members);

      if (normalizedMembers.length === 1) {
        return normalizedMembers[0] ?? node;
      }

      const changed =
        normalizedMembers.length !== node.members.length ||
        normalizedMembers.some((member, index) => member !== node.members[index]);

      return changed ? schemaUnionNode(node.members) : node;
    }

    if (node.kind === "unknown") {
      const normalizedEvidence = normalizeUnknownEvidence(node.evidence);
      const evidenceChanged =
        normalizedEvidence !== node.evidence &&
        !(
          normalizedEvidence === undefined &&
          node.evidence === undefined
        );

      return evidenceChanged
        ? {
            kind: "unknown",
            reason: node.reason,
            nullable: node.nullable,
            ...(normalizedEvidence ? { evidence: normalizedEvidence } : {}),
          }
        : node;
    }

    if (node.kind === "object") {
      return normalizeObjectFieldNameWords(node);
    }

    return node;
  },
};

function normalizeSchemaDocumentWrappers(
  document: SchemaDocument,
): SchemaDocument {
  const normalizedName = identifierName(document.name);
  const nextDefinitions = document.definitions.map(normalizeDefinitionNameWords);
  const definitionsChanged = nextDefinitions.some(
    (definition, index) => definition !== document.definitions[index],
  );

  const nameChanged =
    normalizedName.source !== document.name.source ||
    normalizedName.words.length !== document.name.words.length ||
    normalizedName.words.some((word, index) => word !== document.name.words[index]);

  return !nameChanged && !definitionsChanged
    ? document
    : {
        ...document,
        name: normalizedName,
        definitions: nextDefinitions,
      };
}

function normalizeDefinitionNameWords(
  definition: SchemaDefinition,
): SchemaDefinition {
  const normalizedName = identifierName(definition.name);

  return normalizedName.source === definition.name.source &&
      normalizedName.words.length === definition.name.words.length &&
      normalizedName.words.every((word, index) => word === definition.name.words[index])
    ? definition
    : {
        ...definition,
        name: normalizedName,
      };
}

function normalizeObjectFieldNameWords(node: SchemaObjectNode): SchemaObjectNode {
  let changed = false;
  const nextFields = node.fields.map((field): SchemaFieldNode => {
    const normalizedName = identifierName(field.name);
    const sameName =
      normalizedName.source === field.name.source &&
      normalizedName.words.length === field.name.words.length &&
      normalizedName.words.every((word, index) => word === field.name.words[index]);

    if (sameName) {
      return field;
    }

    changed = true;
    return {
      ...field,
      name: normalizedName,
    };
  });

  return changed
    ? {
        kind: "object",
        fields: nextFields,
      }
    : node;
}
