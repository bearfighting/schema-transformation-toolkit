import type {
  ArrayTypeNode,
  FieldNode,
  IdentifierName,
  ObjectTypeNode,
  ScalarTypeNode,
  SchemaDocument,
  TypeNode,
} from "@aio/core";
import type { ResolvedTypeScriptGeneratorOptions } from "./options.js";

const INDENT = "  ";

export function renderTypeScriptDocument(
  doc: SchemaDocument,
  options: ResolvedTypeScriptGeneratorOptions,
): string {
  if (doc.root.kind === "object") {
    return options.rootObjectMode === "type"
      ? renderRootTypeAlias(doc.name, doc.root, options)
      : renderRootInterface(doc.name, doc.root, options);
  }

  return `export type ${renderTypeName(doc.name, options)} = ${renderTypeNode(doc.root, 0, options)};`;
}

function renderRootInterface(
  name: IdentifierName,
  node: ObjectTypeNode,
  options: ResolvedTypeScriptGeneratorOptions,
): string {
  const fields = node.fields
    .map((field) => renderFieldNode(field, 1, options))
    .join("\n");

  return `export interface ${renderTypeName(name, options)} {\n${fields}\n}`;
}

function renderRootTypeAlias(
  name: IdentifierName,
  node: ObjectTypeNode,
  options: ResolvedTypeScriptGeneratorOptions,
): string {
  return `export type ${renderTypeName(name, options)} = ${renderInlineObjectType(node, 0, options)};`;
}

function renderFieldNode(
  field: FieldNode,
  depth: number,
  options: ResolvedTypeScriptGeneratorOptions,
): string {
  const optionalMarker = field.required ? "" : "?";
  const fieldType = renderFieldType(field, options);

  return `${indent(depth)}${renderFieldName(field.name, options)}${optionalMarker}: ${fieldType};`;
}

function renderFieldType(
  field: FieldNode,
  options: ResolvedTypeScriptGeneratorOptions,
): string {
  const renderedType = renderTypeNode(field.type, 1, options);

  if (!field.nullable) {
    return renderedType;
  }

  return `${wrapForUnion(renderedType)} | null`;
}

function renderTypeNode(
  node: TypeNode,
  depth = 0,
  options: ResolvedTypeScriptGeneratorOptions,
): string {
  if (node.kind === "scalar") {
    return renderScalarType(node);
  }

  if (node.kind === "unknown") {
    return renderUnknownType(node);
  }

  if (node.kind === "array") {
    return renderArrayType(node, depth, options);
  }

  return renderInlineObjectType(node, depth, options);
}

function renderScalarType(node: ScalarTypeNode): string {
  switch (node.scalar) {
    case "string":
      return "string";
    case "integer":
    case "number":
      return "number";
    case "boolean":
      return "boolean";
  }
}

function renderUnknownType(
  node: Extract<TypeNode, { kind: "unknown" }>,
): string {
  if (node.nullable) {
    return "unknown | null";
  }

  return "unknown";
}

function renderArrayType(
  node: ArrayTypeNode,
  depth: number,
  options: ResolvedTypeScriptGeneratorOptions,
): string {
  const renderedElementType = renderTypeNode(node.elementType, depth, options);

  switch (options.arrayStyle) {
    case "generic":
      return `Array<${renderedElementType}>`;
    case "compact":
      return `${wrapForArray(renderedElementType)}[]`;
    case "smart":
    default:
      return isCompactArrayCandidate(renderedElementType)
        ? `${wrapForArray(renderedElementType)}[]`
        : `Array<${renderedElementType}>`;
  }
}

function renderInlineObjectType(
  node: ObjectTypeNode,
  depth: number,
  options: ResolvedTypeScriptGeneratorOptions,
): string {
  const fields = node.fields
    .map((field) => renderFieldNode(field, depth + 1, options))
    .join("\n");

  return `{\n${fields}\n${indent(depth)}}`;
}

function wrapForArray(renderedType: string): string {
  if (renderedType.startsWith("{\n")) {
    return `(${renderedType})`;
  }

  if (renderedType.includes(" | ")) {
    return `(${renderedType})`;
  }

  return renderedType;
}

function wrapForUnion(renderedType: string): string {
  if (renderedType.startsWith("{\n")) {
    return `(${renderedType})`;
  }

  return renderedType;
}

function indent(depth: number): string {
  return INDENT.repeat(depth);
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

function isCompactArrayCandidate(renderedType: string): boolean {
  return isTypeScriptIdentifier(renderedType) || renderedType === "unknown";
}

function isTypeScriptIdentifier(value: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value);
}
