import type {
  IdentifierName,
  SchemaDocument,
  SchemaDefinition,
  SchemaArrayNode,
  SchemaFieldNode,
  SchemaLiteralNode,
  SchemaNode,
  SchemaObjectNode,
  SchemaReferenceNode,
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
  const definitionLookup = new Map(
    doc.definitions.map((definition) => [definition.name.source, definition] as const),
  );
  const sections = [
    ...doc.definitions.map((definition) =>
      renderDefinition(definition, options, definitionLookup),
    ),
    renderRootExport(doc, options, definitionLookup),
  ];

  return sections.join("\n\n");
}

function renderDefinition(
  definition: SchemaDefinition,
  options: ResolvedTypeScriptGeneratorOptions,
  definitionLookup: ReadonlyMap<string, SchemaDefinition>,
): string {
  if (definition.type.kind === "object") {
    return renderRootInterface(
      definition.name,
      definition.type,
      options,
      definitionLookup,
    );
  }

  return `export type ${renderTypeName(definition.name, options)} = ${renderTypeNode(definition.type, 0, options, definitionLookup)};`;
}

function renderRootExport(
  doc: SchemaDocument,
  options: ResolvedTypeScriptGeneratorOptions,
  definitionLookup: ReadonlyMap<string, SchemaDefinition>,
): string {
  if (doc.root.kind === "object") {
    return options.rootObjectMode === "type"
      ? renderRootTypeAlias(doc.name, doc.root, options, definitionLookup)
      : renderRootInterface(doc.name, doc.root, options, definitionLookup);
  }

  return `export type ${renderTypeName(doc.name, options)} = ${renderTypeNode(doc.root, 0, options, definitionLookup)};`;
}

function renderRootInterface(
  name: IdentifierName,
  node: SchemaObjectNode,
  options: ResolvedTypeScriptGeneratorOptions,
  definitionLookup: ReadonlyMap<string, SchemaDefinition>,
): string {
  const fields = node.fields
    .map((field) => renderFieldNode(field, 1, options, definitionLookup))
    .join("\n");

  return `export interface ${renderTypeName(name, options)} {\n${fields}\n}`;
}

function renderRootTypeAlias(
  name: IdentifierName,
  node: SchemaObjectNode,
  options: ResolvedTypeScriptGeneratorOptions,
  definitionLookup: ReadonlyMap<string, SchemaDefinition>,
): string {
  return `export type ${renderTypeName(name, options)} = ${renderInlineObjectType(node, 0, options, definitionLookup)};`;
}

function renderFieldNode(
  field: SchemaFieldNode,
  depth: number,
  options: ResolvedTypeScriptGeneratorOptions,
  definitionLookup: ReadonlyMap<string, SchemaDefinition>,
): string {
  const optionalMarker = field.required ? "" : "?";
  const fieldType = renderFieldType(field, options, definitionLookup);

  return `${indent(depth)}${renderFieldName(field.name, options)}${optionalMarker}: ${fieldType};`;
}

function renderFieldType(
  field: SchemaFieldNode,
  options: ResolvedTypeScriptGeneratorOptions,
  definitionLookup: ReadonlyMap<string, SchemaDefinition>,
): string {
  const renderedType = renderTypeNode(field.type, 1, options, definitionLookup);

  if (!field.nullable) {
    return renderedType;
  }

  return `${wrapForUnion(renderedType)} | null`;
}

function renderTypeNode(
  node: SchemaNode,
  depth = 0,
  options: ResolvedTypeScriptGeneratorOptions,
  definitionLookup: ReadonlyMap<string, SchemaDefinition>,
): string {
  if (node.kind === "scalar") {
    return renderScalarType(node);
  }

  if (node.kind === "literal") {
    return renderLiteralType(node);
  }

  if (node.kind === "reference") {
    return renderReferenceType(node, options, definitionLookup);
  }

  if (node.kind === "union") {
    return renderUnionType(node, depth, options, definitionLookup);
  }

  if (node.kind === "tuple") {
    return renderTupleType(node, depth, options, definitionLookup);
  }

  if (node.kind === "record") {
    return renderRecordType(node, depth, options, definitionLookup);
  }

  if (node.kind === "unknown") {
    return renderUnknownType(node);
  }

  if (node.kind === "null") {
    return renderNullType();
  }

  if (node.kind === "array") {
    return renderArrayType(node, depth, options, definitionLookup);
  }

  return renderInlineObjectType(node, depth, options, definitionLookup);
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

function renderReferenceType(
  node: SchemaReferenceNode,
  options: ResolvedTypeScriptGeneratorOptions,
  definitionLookup: ReadonlyMap<string, SchemaDefinition>,
): string {
  const definition = definitionLookup.get(node.name);

  if (definition === undefined) {
    return node.name;
  }

  return renderTypeName(definition.name, options);
}

function renderUnionType(
  node: SchemaUnionNode,
  depth: number,
  options: ResolvedTypeScriptGeneratorOptions,
  definitionLookup: ReadonlyMap<string, SchemaDefinition>,
): string {
  return node.members
    .map((member) => renderTypeNode(member, depth, options, definitionLookup))
    .join(" | ");
}

function renderTupleType(
  node: SchemaTupleNode,
  depth: number,
  options: ResolvedTypeScriptGeneratorOptions,
  definitionLookup: ReadonlyMap<string, SchemaDefinition>,
): string {
  return `[${node.elements
    .map((element) =>
      renderTupleElement(element, depth, options, definitionLookup),
    )
    .join(", ")}]`;
}

function renderTupleElement(
  element: SchemaTupleElement,
  depth: number,
  options: ResolvedTypeScriptGeneratorOptions,
  definitionLookup: ReadonlyMap<string, SchemaDefinition>,
): string {
  const renderedType = renderTypeNode(
    element.type,
    depth,
    options,
    definitionLookup,
  );

  if (element.required) {
    return renderedType;
  }

  return `${wrapForOptionalTupleElement(renderedType)}?`;
}

function renderRecordType(
  node: SchemaRecordNode,
  depth: number,
  options: ResolvedTypeScriptGeneratorOptions,
  definitionLookup: ReadonlyMap<string, SchemaDefinition>,
): string {
  return `Record<${renderTypeNode(node.key, depth, options, definitionLookup)}, ${renderTypeNode(node.value, depth, options, definitionLookup)}>`;
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
  definitionLookup: ReadonlyMap<string, SchemaDefinition>,
): string {
  const renderedElementType = renderTypeNode(
    node.elementType,
    depth,
    options,
    definitionLookup,
  );

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
  definitionLookup: ReadonlyMap<string, SchemaDefinition>,
): string {
  const fields = node.fields
    .map((field) =>
      renderFieldNode(field, depth + 1, options, definitionLookup),
    )
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
