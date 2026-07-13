import type {
  IdentifierName,
  SchemaDiagnostic,
  SchemaDefinition,
  SchemaDocument,
  SchemaNode,
  SchemaObjectNode,
} from "@aio/core";
import type { ResolvedTypeScriptGeneratorOptions } from "./options.js";
import type { TypeScriptGenerateFailureResult } from "./failure.js";
import { TYPESCRIPT_RESERVED_WORDS } from "./naming.js";

export function validateRenderableDocument(
  doc: SchemaDocument,
  options: ResolvedTypeScriptGeneratorOptions,
): TypeScriptGenerateFailureResult | null {
  const renderedTypeName = renderTypeName(doc.name, options);

  if (!isValidTypeName(renderedTypeName)) {
    return createValidationFailure(
      "invalid-type-name",
      `The rendered type name "${renderedTypeName}" is not a valid TypeScript identifier.`,
      ["document"],
      "document",
      {
        renderedName: renderedTypeName,
        sourceName: doc.name.source,
      },
    );
  }

  for (const definition of doc.definitions) {
    const definitionNameFailure = validateRenderableDefinitionName(
      definition,
      options,
      ["definitions", definition.name.source],
    );

    if (definitionNameFailure !== null) {
      return definitionNameFailure;
    }

    const definitionFailure = validateRenderableTypeNode(
      definition.type,
      options,
      doc,
      ["definitions", definition.name.source],
    );

    if (definitionFailure !== null) {
      return definitionFailure;
    }
  }

  return validateRenderableTypeNode(doc.root, options, doc, ["root"]);
}

function validateRenderableTypeNode(
  node: SchemaNode,
  options: ResolvedTypeScriptGeneratorOptions,
  doc: SchemaDocument,
  path: string[],
): TypeScriptGenerateFailureResult | null {
  switch (node.kind) {
    case "scalar":
    case "literal":
    case "null":
    case "unknown":
      return null;
    case "reference": {
      const definition = doc.definitions.find(
        (candidate) => candidate.name.source === node.name,
      );

      if (definition === undefined) {
        return createValidationFailure(
          "invalid-reference-name",
          `The schema reference "${node.name}" does not match a renderable definition.`,
          path,
          "reference",
          {
            referenceName: node.name,
          },
        );
      }

      const renderedReferenceName = renderTypeName(definition.name, options);

      if (!isValidTypeName(renderedReferenceName)) {
        return createValidationFailure(
          "invalid-reference-name",
          `The rendered reference name "${renderedReferenceName}" for schema reference "${node.name}" is not a valid TypeScript identifier.`,
          path,
          "reference",
          {
            referenceName: node.name,
            renderedName: renderedReferenceName,
          },
        );
      }

      return null;
    }
    case "array":
      return validateRenderableTypeNode(node.elementType, options, doc, [
        ...path,
        "elementType",
      ]);
    case "tuple":
      for (const [index, element] of node.elements.entries()) {
        const elementFailure = validateRenderableTypeNode(
          element.type,
          options,
          doc,
          [...path, String(index)],
        );

        if (elementFailure !== null) {
          return elementFailure;
        }
      }
      return null;
    case "record": {
      const keyFailure = validateRenderableTypeNode(node.key, options, doc, [
        ...path,
        "key",
      ]);

      if (keyFailure !== null) {
        return keyFailure;
      }

      return validateRenderableTypeNode(node.value, options, doc, [
        ...path,
        "value",
      ]);
    }
    case "union":
      for (const [index, member] of node.members.entries()) {
        const memberFailure = validateRenderableTypeNode(member, options, doc, [
          ...path,
          String(index),
        ]);

        if (memberFailure !== null) {
          return memberFailure;
        }
      }
      return null;
    case "object":
      return validateRenderableObjectType(node, options, doc, path);
    default:
      return createValidationFailure(
        "unsupported-node-kind",
        `The TypeScript generator does not support node kind "${String((node as { kind: string }).kind)}".`,
        path,
        String((node as { kind: string }).kind),
      );
  }
}

function validateRenderableDefinitionName(
  definition: SchemaDefinition,
  options: ResolvedTypeScriptGeneratorOptions,
  path: string[],
): TypeScriptGenerateFailureResult | null {
  const renderedTypeName = renderTypeName(definition.name, options);

  if (!isValidTypeName(renderedTypeName)) {
    return createValidationFailure(
      "invalid-type-name",
      `The rendered type name "${renderedTypeName}" for schema definition "${definition.name.source}" is not a valid TypeScript identifier.`,
      path,
      "definition",
      {
        renderedName: renderedTypeName,
        sourceName: definition.name.source,
      },
    );
  }

  return null;
}

function validateRenderableObjectType(
  node: SchemaObjectNode,
  options: ResolvedTypeScriptGeneratorOptions,
  doc: SchemaDocument,
  path: string[],
): TypeScriptGenerateFailureResult | null {
  for (const field of node.fields) {
    const renderedFieldName = renderFieldName(field.name, options);
    const fieldPath = [...path, field.name.source];

    if (!isValidFieldName(renderedFieldName)) {
      return createValidationFailure(
        "invalid-field-name",
        `The rendered field name "${renderedFieldName}" for source field "${field.name.source}" is not valid TypeScript property syntax.`,
        fieldPath,
        "field",
        {
          renderedName: renderedFieldName,
          sourceName: field.name.source,
        },
      );
    }

    const nestedFailure = validateRenderableTypeNode(
      field.type,
      options,
      doc,
      fieldPath,
    );

    if (nestedFailure !== null) {
      return nestedFailure;
    }
  }

  return null;
}

function createValidationFailure(
  code: TypeScriptGenerateFailureResult["code"],
  message: string,
  path: string[],
  nodeKind: string,
  evidence?: Record<string, unknown>,
): TypeScriptGenerateFailureResult {
  const diagnostic: SchemaDiagnostic = {
    severity: "error",
    code,
    message,
    path,
    nodeKind,
    source: "generator-typescript",
  };

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

function renderTypeName(
  name: IdentifierName,
  options: ResolvedTypeScriptGeneratorOptions,
): string {
  return options.namingStrategy.renderTypeName(name);
}

function renderFieldName(
  name: IdentifierName,
  options: ResolvedTypeScriptGeneratorOptions,
): string {
  return options.namingStrategy.renderFieldName(name);
}

function isValidTypeName(value: string): boolean {
  return (
    isTypeScriptIdentifier(value) &&
    !(TYPESCRIPT_RESERVED_WORDS as readonly string[]).includes(value)
  );
}

function isValidFieldName(value: string): boolean {
  return isTypeScriptIdentifier(value) || isQuotedPropertyKey(value);
}

function isTypeScriptIdentifier(value: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value);
}

function isQuotedPropertyKey(value: string): boolean {
  return /^"(?:\\.|[^"\\])*"$/.test(value);
}
