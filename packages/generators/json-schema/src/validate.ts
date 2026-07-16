import type {
  SchemaDiagnostic,
  SchemaDiagnosticNodeKind,
  SchemaDocument,
  SchemaNode,
} from "@aio/core";
import type { JsonSchemaGenerateFailureResult } from "./failure.js";

export function validateJsonSchemaDocument(
  doc: SchemaDocument,
): JsonSchemaGenerateFailureResult | null {
  for (const definition of doc.definitions) {
    const definitionFailure = validateJsonSchemaNode(definition.type, doc, [
      "definitions",
      definition.name.source,
    ]);

    if (definitionFailure !== null) {
      return definitionFailure;
    }
  }

  return validateJsonSchemaNode(doc.root, doc, ["root"]);
}

function validateJsonSchemaNode(
  node: SchemaNode,
  doc: SchemaDocument,
  path: string[],
): JsonSchemaGenerateFailureResult | null {
  const runtimeNodeKind: string = node.kind;

  switch (node.kind) {
    case "scalar":
    case "literal":
    case "null":
    case "unknown":
      return null;
    case "reference":
      return doc.definitions.some(
        (definition) => definition.name.source === node.name,
      )
        ? null
        : createValidationFailure(
            "invalid-json-schema-reference",
            `The schema reference "${node.name}" does not match a renderable definition.`,
            path,
            "reference",
            {
              referenceName: node.name,
            },
          );
    case "array":
      return validateJsonSchemaNode(node.elementType, doc, [
        ...path,
        "elementType",
      ]);
    case "tuple":
      for (const [index, element] of node.elements.entries()) {
        const failure = validateJsonSchemaNode(element.type, doc, [
          ...path,
          String(index),
        ]);

        if (failure !== null) {
          return failure;
        }
      }
      return null;
    case "record":
      if (node.key.kind !== "scalar" || node.key.scalar !== "string") {
        return createValidationFailure(
          "invalid-record-key",
          "JSON Schema record keys must render from string scalar keys.",
          [...path, "key"],
          "record",
        );
      }

      return validateJsonSchemaNode(node.value, doc, [...path, "value"]);
    case "union":
      for (const [index, member] of node.members.entries()) {
        const failure = validateJsonSchemaNode(member, doc, [
          ...path,
          String(index),
        ]);

        if (failure !== null) {
          return failure;
        }
      }
      return null;
    case "object":
      for (const field of node.fields) {
        const failure = validateJsonSchemaNode(field.type, doc, [
          ...path,
          field.name.source,
        ]);

        if (failure !== null) {
          return failure;
        }
      }
      return null;
    default:
      return createValidationFailure(
        "unsupported-node-kind",
        `The JSON Schema generator does not support node kind "${runtimeNodeKind}".`,
        path,
        toSchemaDiagnosticNodeKind(runtimeNodeKind),
      );
  }
}

function createValidationFailure(
  code: JsonSchemaGenerateFailureResult["code"],
  message: string,
  path: string[],
  nodeKind?: SchemaDiagnosticNodeKind,
  evidence?: Record<string, unknown>,
): JsonSchemaGenerateFailureResult {
  const diagnostic: SchemaDiagnostic = {
    severity: "error",
    code,
    message,
    path,
    source: "generator-json-schema",
  };

  if (nodeKind !== undefined) {
    diagnostic.nodeKind = nodeKind;
  }

  if (evidence !== undefined) {
    diagnostic.evidence = evidence;
  }

  return {
    ok: false,
    code,
    message,
    diagnostics: [diagnostic],
  };
}

function toSchemaDiagnosticNodeKind(
  value: string,
): SchemaDiagnosticNodeKind | undefined {
  switch (value) {
    case "scalar":
    case "literal":
    case "reference":
    case "union":
    case "tuple":
    case "record":
    case "null":
    case "unknown":
    case "field":
    case "object":
    case "array":
    case "document":
    case "definition":
    case "entry":
    case "type":
    case "type-member":
    case "property-name":
    case "type-reference":
      return value;
    default:
      return undefined;
  }
}
