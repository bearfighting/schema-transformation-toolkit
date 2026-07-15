import type {
  SchemaArrayNode,
  SchemaDocument,
  SchemaNode,
  SchemaObjectNode,
  SchemaRecordNode,
  SchemaTupleNode,
  SchemaUnionNode,
} from "@aio/core";
import type {
  JsonSchemaOutput,
  ResolvedJsonSchemaGeneratorOptions,
} from "./options.js";

const DRAFT_2020_12_URI = "https://json-schema.org/draft/2020-12/schema";

export function renderJsonSchemaDocument(
  doc: SchemaDocument,
  options: ResolvedJsonSchemaGeneratorOptions,
): JsonSchemaOutput {
  const rootSchema = renderJsonSchemaNode(doc.root, options);
  const metadata: Record<string, unknown> = {
    title: doc.name.source,
  };

  if (options.includeSchemaUri) {
    metadata.$schema = DRAFT_2020_12_URI;
  }

  if (options.includeId) {
    metadata.$id = doc.name.source;
  }

  if (doc.definitions.length > 0) {
    metadata.$defs = Object.fromEntries(
      doc.definitions.map((definition) => [
        definition.name.source,
        renderJsonSchemaNode(definition.type, options),
      ]),
    );
  }

  if (typeof rootSchema === "boolean") {
    if (rootSchema) {
      return metadata;
    }

    return {
      ...metadata,
      allOf: [rootSchema],
    };
  }

  return {
    ...metadata,
    ...rootSchema,
  };
}

function renderJsonSchemaNode(
  node: SchemaNode,
  options: ResolvedJsonSchemaGeneratorOptions,
): JsonSchemaOutput {
  switch (node.kind) {
    case "scalar":
      return renderScalarNode(node.scalar);
    case "literal":
      return { const: node.value };
    case "null":
      return { type: "null" };
    case "unknown":
      return options.unknownStrategy === "true" ? true : true;
    case "reference":
      return { $ref: `#/$defs/${node.name}` };
    case "array":
      return renderArrayNode(node, options);
    case "tuple":
      return renderTupleNode(node, options);
    case "record":
      return renderRecordNode(node, options);
    case "union":
      return renderUnionNode(node, options);
    case "object":
      return renderObjectNode(node, options);
  }
}

function renderScalarNode(
  scalar: "string" | "integer" | "number" | "boolean",
): JsonSchemaOutput {
  return { type: scalar };
}

function renderArrayNode(
  node: SchemaArrayNode,
  options: ResolvedJsonSchemaGeneratorOptions,
): JsonSchemaOutput {
  return {
    type: "array",
    items: renderJsonSchemaNode(node.elementType, options),
  };
}

function renderTupleNode(
  node: SchemaTupleNode,
  options: ResolvedJsonSchemaGeneratorOptions,
): JsonSchemaOutput {
  return {
    type: "array",
    prefixItems: node.elements.map((element) =>
      renderJsonSchemaNode(element.type, options),
    ),
    minItems: node.elements.filter((element) => element.required).length,
    items: false,
  };
}

function renderRecordNode(
  node: SchemaRecordNode,
  options: ResolvedJsonSchemaGeneratorOptions,
): JsonSchemaOutput {
  return {
    type: "object",
    additionalProperties: renderJsonSchemaNode(node.value, options),
  };
}

function renderUnionNode(
  node: SchemaUnionNode,
  options: ResolvedJsonSchemaGeneratorOptions,
): JsonSchemaOutput {
  return {
    [options.unionComposition]: node.members.map((member) =>
      renderJsonSchemaNode(member, options),
    ),
  };
}

function renderObjectNode(
  node: SchemaObjectNode,
  options: ResolvedJsonSchemaGeneratorOptions,
): JsonSchemaOutput {
  const properties = Object.fromEntries(
    node.fields.map((field) => [
      field.name.source,
      renderFieldSchema(field.type, field.nullable, options),
    ]),
  );
  const required = node.fields
    .filter((field) => field.required)
    .map((field) => field.name.source);

  return {
    type: "object",
    properties,
    ...(options.objectAdditionalPropertiesMode === "false"
      ? { additionalProperties: false }
      : {}),
    ...(required.length > 0 ? { required } : {}),
  };
}

function renderFieldSchema(
  node: SchemaNode,
  nullable: boolean,
  options: ResolvedJsonSchemaGeneratorOptions,
): JsonSchemaOutput {
  const rendered = renderJsonSchemaNode(node, options);

  if (!nullable) {
    return rendered;
  }

  return {
    oneOf: [rendered, { type: "null" }],
  };
}
