import {
  areEquivalentSchemaNodes,
  normalizeSchemaDocument,
  tryValidateSchemaDocument,
  type SchemaDefinition,
  type SchemaDocument,
  type SchemaFieldNode,
  type SchemaNode,
  type SchemaNodeKind,
} from "@aio/core";
import { expect } from "vitest";

export function expectValidIr(document: SchemaDocument): void {
  expect(tryValidateSchemaDocument(document)).toEqual({ ok: true });
}

export function expectIrEquivalent(
  actual: SchemaDocument,
  expected: SchemaDocument,
): void {
  const normalizedActual = normalizeSchemaDocumentForTest(actual);
  const normalizedExpected = normalizeSchemaDocumentForTest(expected);

  expectValidIr(normalizedActual);
  expectValidIr(normalizedExpected);

  expect(normalizedActual.name.source).toBe(normalizedExpected.name.source);
  expect(
    normalizedActual.definitions.map((definition) => definition.name.source),
  ).toEqual(
    normalizedExpected.definitions.map((definition) => definition.name.source),
  );

  for (const [index, definition] of normalizedActual.definitions.entries()) {
    expect(
      areEquivalentSchemaNodes(
        definition.type,
        normalizedExpected.definitions[index]?.type ?? normalizedExpected.root,
      ),
    ).toBe(true);
  }

  expect(
    areEquivalentSchemaNodes(normalizedActual.root, normalizedExpected.root),
  ).toBe(true);
}

export function normalizeSchemaDocumentForTest(
  document: SchemaDocument,
): SchemaDocument {
  const normalizedDocument = normalizeSchemaDocument(document);
  const collapsedDocument = collapseSingleRootReferenceDocument(normalizedDocument);

  return {
    ...collapsedDocument,
    name: normalizeIdentifierName(collapsedDocument.name),
    definitions: [...collapsedDocument.definitions]
      .map(normalizeSchemaDefinitionForTest)
      .sort((left, right) => left.name.source.localeCompare(right.name.source)),
    root: normalizeSchemaNodeForTest(collapsedDocument.root),
  };
}

function collapseSingleRootReferenceDocument(
  document: SchemaDocument,
): SchemaDocument {
  const root = document.root;

  if (root.kind !== "reference") {
    return document;
  }

  const rootDefinition = document.definitions.find(
    (definition) => definition.name.source === root.name,
  );

  if (!rootDefinition) {
    return document;
  }

  return {
    ...document,
    definitions: isSchemaDefinitionReferenced(
      rootDefinition.name.source,
      document.definitions,
    )
      ? document.definitions
      : document.definitions.filter(
          (definition) => definition.name.source !== rootDefinition.name.source,
        ),
    root: rootDefinition.type,
  };
}

function isSchemaDefinitionReferenced(
  definitionName: string,
  definitions: SchemaDefinition[],
): boolean {
  return definitions.some((definition) =>
    schemaNodeReferencesDefinition(definition.type, definitionName),
  );
}

function schemaNodeReferencesDefinition(
  node: SchemaNode,
  definitionName: string,
): boolean {
  switch (node.kind) {
    case "scalar":
    case "literal":
    case "null":
    case "unknown":
      return false;
    case "reference":
      return node.name === definitionName;
    case "array":
      return schemaNodeReferencesDefinition(node.elementType, definitionName);
    case "tuple":
      return node.elements.some((element) =>
        schemaNodeReferencesDefinition(element.type, definitionName),
      );
    case "record":
      return (
        schemaNodeReferencesDefinition(node.key, definitionName) ||
        schemaNodeReferencesDefinition(node.value, definitionName)
      );
    case "object":
      return node.fields.some((field) =>
        schemaNodeReferencesDefinition(field.type, definitionName),
      );
    case "union":
      return node.members.some((member) =>
        schemaNodeReferencesDefinition(member, definitionName),
      );
  }
}

function normalizeSchemaDefinitionForTest(
  definition: SchemaDefinition,
): SchemaDefinition {
  return {
    name: normalizeIdentifierName(definition.name),
    type: normalizeSchemaNodeForTest(definition.type),
  };
}

function normalizeSchemaNodeForTest(node: SchemaNode): SchemaNode {
  switch (node.kind) {
    case "scalar":
    case "literal":
    case "null":
      return node;
    case "reference":
      return {
        ...node,
        name: node.name.trim(),
      };
    case "unknown":
      return {
        kind: "unknown",
        reason: node.reason,
        nullable: node.nullable,
      };
    case "array":
      return {
        kind: "array",
        elementType: normalizeSchemaNodeForTest(node.elementType),
      };
    case "tuple":
      return {
        kind: "tuple",
        elements: node.elements.map((element) => ({
          required: element.required,
          type: normalizeSchemaNodeForTest(element.type),
        })),
      };
    case "record":
      return {
        kind: "record",
        key: normalizeSchemaNodeForTest(node.key),
        value: normalizeSchemaNodeForTest(node.value),
      };
    case "object":
      return {
        kind: "object",
        fields: [...node.fields]
          .map(normalizeSchemaFieldForTest)
          .sort((left, right) =>
            left.name.source.localeCompare(right.name.source),
          ),
      };
    case "union":
      return {
        kind: "union",
        members: [...node.members]
          .map(normalizeSchemaNodeForTest)
          .sort((left, right) =>
            getSchemaNodeSortKey(left).localeCompare(
              getSchemaNodeSortKey(right),
            ),
          ),
      };
  }
}

function normalizeSchemaFieldForTest(field: SchemaFieldNode): SchemaFieldNode {
  return {
    kind: "field",
    name: normalizeIdentifierName(field.name),
    required: field.required,
    nullable: field.nullable,
    type: normalizeSchemaNodeForTest(field.type),
  };
}

function normalizeIdentifierName(name: { source: string; words: string[] }) {
  return {
    source: name.source,
    words: [...name.words],
  };
}

function getSchemaNodeSortKey(node: SchemaNode): string {
  switch (node.kind) {
    case "scalar":
      return `scalar:${node.scalar}`;
    case "literal":
      return `literal:${JSON.stringify(node.value)}`;
    case "reference":
      return `reference:${node.name}`;
    case "null":
      return "null";
    case "unknown":
      return `unknown:${node.reason}:${node.nullable ? "nullable" : "strict"}`;
    case "array":
      return `array:${getSchemaNodeSortKey(node.elementType)}`;
    case "tuple":
      return `tuple:${node.elements
        .map(
          (element) =>
            `${element.required ? "required" : "optional"}:${getSchemaNodeSortKey(
              element.type,
            )}`,
        )
        .join("|")}`;
    case "record":
      return `record:${getSchemaNodeSortKey(node.key)}:${getSchemaNodeSortKey(node.value)}`;
    case "object":
      return `object:${node.fields
        .map(
          (field) => `${field.name.source}:${getSchemaNodeSortKey(field.type)}`,
        )
        .join("|")}`;
    case "union":
      return `union:${node.members.map(getSchemaNodeSortKey).join("|")}`;
    default:
      return assertNever(node);
  }
}

function assertNever(node: never): never {
  throw new Error(`Unhandled schema node kind: ${(node as SchemaNode).kind}`);
}

export function expectShapeKind(
  document: SchemaDocument | SchemaNode,
  kind: SchemaNodeKind,
): void {
  const node = isSchemaDocument(document)
    ? normalizeSchemaDocumentForTest(document).root
    : document;
  expect(node.kind).toBe(kind);
}

export function expectOptionalProperty(
  document: SchemaDocument,
  propertyName: string,
  expectedKind: SchemaNodeKind,
): void {
  const field = expectObjectField(document, propertyName);

  expect(field.required).toBe(false);
  expect(field.nullable).toBe(false);
  expect(field.type.kind).toBe(expectedKind);
}

export function expectRequiredProperty(
  document: SchemaDocument,
  propertyName: string,
  expectedKind: SchemaNodeKind,
): void {
  const field = expectObjectField(document, propertyName);

  expect(field.required).toBe(true);
  expect(field.nullable).toBe(false);
  expect(field.type.kind).toBe(expectedKind);
}

export function expectNullableProperty(
  document: SchemaDocument,
  propertyName: string,
  expectedKind: SchemaNodeKind,
): void {
  const field = expectObjectField(document, propertyName);

  expect(field.required).toBe(true);
  expect(field.nullable).toBe(true);
  expect(field.type.kind).toBe(expectedKind);
}

export function expectReference(
  document: SchemaDocument,
  expectedName: string,
): void {
  expect(document.root.kind).toBe("reference");

  if (document.root.kind !== "reference") {
    throw new Error("Expected schema document root to be a reference.");
  }

  expect(document.root.name).toBe(expectedName);
}

export function expectObjectFieldReference(
  document: SchemaDocument,
  propertyName: string,
  expectedReferenceName: string,
): void {
  const field = expectObjectField(document, propertyName);

  expect(field.type.kind).toBe("reference");

  if (field.type.kind !== "reference") {
    throw new Error(
      `Expected object field "${propertyName}" to reference "${expectedReferenceName}".`,
    );
  }

  expect(field.type.name).toBe(expectedReferenceName);
}

export function expectArrayFieldElementReference(
  document: SchemaDocument,
  propertyName: string,
  expectedReferenceName: string,
): void {
  const field = expectObjectField(document, propertyName);

  expect(field.type.kind).toBe("array");

  if (field.type.kind !== "array") {
    throw new Error(
      `Expected object field "${propertyName}" to be an array of references.`,
    );
  }

  expect(field.type.elementType.kind).toBe("reference");

  if (field.type.elementType.kind !== "reference") {
    throw new Error(
      `Expected object field "${propertyName}" to be an array of "${expectedReferenceName}" references.`,
    );
  }

  expect(field.type.elementType.name).toBe(expectedReferenceName);
}

export function expectUnknownRoot(
  document: SchemaDocument,
  options?: {
    nullable?: boolean;
    reason?: string;
  },
): void {
  const normalizedDocument = normalizeSchemaDocumentForTest(document);

  expect(normalizedDocument.root.kind).toBe("unknown");

  if (normalizedDocument.root.kind !== "unknown") {
    throw new Error("Expected schema document root to be unknown.");
  }

  if (options?.nullable !== undefined) {
    expect(normalizedDocument.root.nullable).toBe(options.nullable);
  }

  if (options?.reason !== undefined) {
    expect(normalizedDocument.root.reason).toBe(options.reason);
  }
}

export function expectTupleElementKinds(
  document: SchemaDocument,
  expectedElements: Array<{
    kind: SchemaNodeKind;
    required: boolean;
  }>,
): void {
  const normalizedDocument = normalizeSchemaDocumentForTest(document);

  expect(normalizedDocument.root.kind).toBe("tuple");

  if (normalizedDocument.root.kind !== "tuple") {
    throw new Error("Expected schema document root to be a tuple.");
  }

  expect(normalizedDocument.root.elements).toHaveLength(
    expectedElements.length,
  );

  for (const [index, expectedElement] of expectedElements.entries()) {
    const actualElement = normalizedDocument.root.elements[index];

    expect(actualElement?.required).toBe(expectedElement.required);
    expect(actualElement?.type.kind).toBe(expectedElement.kind);
  }
}

function expectObjectField(
  document: SchemaDocument,
  propertyName: string,
): SchemaFieldNode {
  const normalizedDocument = normalizeSchemaDocumentForTest(document);

  expect(normalizedDocument.root.kind).toBe("object");

  if (normalizedDocument.root.kind !== "object") {
    throw new Error("Expected schema document root to be an object.");
  }

  const field = normalizedDocument.root.fields.find(
    (candidate) => candidate.name.source === propertyName,
  );

  expect(field).toBeDefined();

  if (!field) {
    throw new Error(`Expected object field "${propertyName}" to exist.`);
  }

  return field;
}

function isSchemaDocument(
  document: SchemaDocument | SchemaNode,
): document is SchemaDocument {
  return document.kind === "document";
}
