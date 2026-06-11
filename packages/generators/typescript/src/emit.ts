import type {
  IdentifierName,
  SchemaDocument,
  SchemaArrayNode,
  SchemaFieldNode,
  SchemaLiteralNode,
  SchemaNode,
  SchemaObjectNode,
  SchemaRecordNode,
  SchemaScalarNode,
  SchemaTupleElement,
  SchemaTupleNode,
  SchemaUnionNode,
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
  node: SchemaObjectNode,
  options: ResolvedTypeScriptGeneratorOptions,
): string {
  const fields = node.fields
    .map((field) => renderFieldNode(field, 1, options))
    .join("\n");

  return `export interface ${renderTypeName(name, options)} {\n${fields}\n}`;
}

function renderRootTypeAlias(
  name: IdentifierName,
  node: SchemaObjectNode,
  options: ResolvedTypeScriptGeneratorOptions,
): string {
  return `export type ${renderTypeName(name, options)} = ${renderInlineObjectType(node, 0, options)};`;
}

function renderFieldNode(
  field: SchemaFieldNode,
  depth: number,
  options: ResolvedTypeScriptGeneratorOptions,
): string {
  const optionalMarker = field.required ? "" : "?";
  const fieldType = renderFieldType(field, options);

  return `${indent(depth)}${renderFieldName(field.name, options)}${optionalMarker}: ${fieldType};`;
}

function renderFieldType(
  field: SchemaFieldNode,
  options: ResolvedTypeScriptGeneratorOptions,
): string {
  const renderedType = renderTypeNode(field.type, 1, options);

  if (!field.nullable) {
    return renderedType;
  }

  return `${wrapForUnion(renderedType)} | null`;
}

function renderTypeNode(
  node: SchemaNode,
  depth = 0,
  options: ResolvedTypeScriptGeneratorOptions,
): string {
  if (node.kind === "scalar") {
    return renderScalarType(node);
  }

  if (node.kind === "literal") {
    return renderLiteralType(node);
  }

  if (node.kind === "union") {
    return renderUnionType(node, depth, options);
  }

  if (node.kind === "tuple") {
    return renderTupleType(node, depth, options);
  }

  if (node.kind === "record") {
    return renderRecordType(node, depth, options);
  }

  if (node.kind === "unknown") {
    return renderUnknownType(node);
  }

  if (node.kind === "null") {
    return renderNullType();
  }

  if (node.kind === "array") {
    return renderArrayType(node, depth, options);
  }

  return renderInlineObjectType(node, depth, options);
}

function renderScalarType(node: SchemaScalarNode): string {
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

function renderLiteralType(node: SchemaLiteralNode): string {
  if (typeof node.value === "string") {
    return JSON.stringify(node.value);
  }

  return String(node.value);
}

function renderUnionType(
  node: SchemaUnionNode,
  depth: number,
  options: ResolvedTypeScriptGeneratorOptions,
): string {
  return node.members
    .map((member) => renderTypeNode(member, depth, options))
    .join(" | ");
}

function renderTupleType(
  node: SchemaTupleNode,
  depth: number,
  options: ResolvedTypeScriptGeneratorOptions,
): string {
  return `[${node.elements
    .map((element) => renderTupleElement(element, depth, options))
    .join(", ")}]`;
}

function renderTupleElement(
  element: SchemaTupleElement,
  depth: number,
  options: ResolvedTypeScriptGeneratorOptions,
): string {
  const renderedType = renderTypeNode(element.type, depth, options);

  if (element.required) {
    return renderedType;
  }

  return `${wrapForOptionalTupleElement(renderedType)}?`;
}

function renderRecordType(
  node: SchemaRecordNode,
  depth: number,
  options: ResolvedTypeScriptGeneratorOptions,
): string {
  return `Record<${renderTypeNode(node.key, depth, options)}, ${renderTypeNode(node.value, depth, options)}>`;
}

function renderUnknownType(
  node: Extract<SchemaNode, { kind: "unknown" }>,
): string {
  if (node.nullable) {
    return "unknown | null";
  }

  return "unknown";
}

function renderNullType(): string {
  return "null";
}

function renderArrayType(
  node: SchemaArrayNode,
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
  node: SchemaObjectNode,
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

  if (renderedType.includes(" | ")) {
    return `(${renderedType})`;
  }

  return renderedType;
}

function wrapForOptionalTupleElement(renderedType: string): string {
  if (renderedType.startsWith("{\n")) {
    return `(${renderedType})`;
  }

  if (renderedType.includes(" | ")) {
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
