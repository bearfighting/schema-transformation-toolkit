import type { IdentifierName, ObjectTypeNode, SchemaDocument, TypeNode } from "@aio/core";
import type { ResolvedTypeScriptGeneratorOptions } from "./options.js";
import type { TypeScriptGenerateFailureResult } from "./failure.js";
import { TYPESCRIPT_RESERVED_WORDS } from "./naming.js";

export function validateRenderableDocument(
  doc: SchemaDocument,
  options: ResolvedTypeScriptGeneratorOptions,
): TypeScriptGenerateFailureResult | null {
  const renderedTypeName = renderTypeName(doc.name, options);

  if (!isValidTypeName(renderedTypeName)) {
    return {
      ok: false,
      code: "invalid-type-name",
      message: `The rendered type name "${renderedTypeName}" is not a valid TypeScript identifier.`,
    };
  }

  return validateRenderableTypeNode(doc.root, options);
}

function validateRenderableTypeNode(
  node: TypeNode,
  options: ResolvedTypeScriptGeneratorOptions,
): TypeScriptGenerateFailureResult | null {
  switch (node.kind) {
    case "scalar":
    case "unknown":
      return null;
    case "array":
      return validateRenderableTypeNode(node.elementType, options);
    case "object":
      return validateRenderableObjectType(node, options);
    default:
      return {
        ok: false,
        code: "unsupported-node-kind",
        message: `The TypeScript generator does not support node kind "${String((node as { kind: string }).kind)}".`,
      };
  }
}

function validateRenderableObjectType(
  node: ObjectTypeNode,
  options: ResolvedTypeScriptGeneratorOptions,
): TypeScriptGenerateFailureResult | null {
  for (const field of node.fields) {
    const renderedFieldName = renderFieldName(field.name, options);

    if (!isValidFieldName(renderedFieldName)) {
      return {
        ok: false,
        code: "invalid-field-name",
        message: `The rendered field name "${renderedFieldName}" for source field "${field.name.source}" is not valid TypeScript property syntax.`,
      };
    }

    const nestedFailure = validateRenderableTypeNode(field.type, options);

    if (nestedFailure !== null) {
      return nestedFailure;
    }
  }

  return null;
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
